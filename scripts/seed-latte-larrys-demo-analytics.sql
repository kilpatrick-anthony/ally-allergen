-- One-off patch for existing demo account: "Latte Larry's"
-- Purpose:
-- 1) Ensure business is on demo plan
-- 2) Backfill suppliers from ingredient supplier arrays
-- 3) Backfill menu_item_ingredients links for seeded demo items
-- 4) Seed kiosk analytics + PDF download events for admin analytics pages
--
-- Safe to re-run: existing demo-seeded analytics rows are removed/replaced by this script.

DO $$
DECLARE
  v_business_id UUID;
  v_slug TEXT;
  v_owner_user_id UUID;
BEGIN
  SELECT b.id, b.slug
  INTO v_business_id, v_slug
  FROM businesses b
  WHERE lower(b.name) = lower('Latte Larry''s')
  ORDER BY b.created_at DESC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Business "Latte Larry''''s" not found';
  END IF;

  SELECT ub.user_id
  INTO v_owner_user_id
  FROM user_businesses ub
  WHERE ub.business_id = v_business_id AND ub.role = 'owner'
  LIMIT 1;

  -- Keep this tenant explicitly on demo plan.
  UPDATE businesses
  SET
    plan_type = 'demo',
    settings = jsonb_set(
      jsonb_set(COALESCE(settings, '{}'::jsonb), '{subscription,plan}', '"demo"', true),
      '{subscription,status}',
      '"active"',
      true
    )
  WHERE id = v_business_id;

  -- Backfill suppliers from ingredient supplier arrays.
  INSERT INTO suppliers (business_id, name, ingredient_count, created_by)
  SELECT
    v_business_id,
    supplier_name,
    COUNT(*)::int,
    v_owner_user_id
  FROM (
    SELECT trim(supplier_name) AS supplier_name
    FROM ingredients i,
         unnest(COALESCE(i.suppliers, ARRAY[]::text[])) AS supplier_name
    WHERE i.business_id = v_business_id
  ) s
  WHERE supplier_name <> ''
  GROUP BY supplier_name
  ON CONFLICT (business_id, name)
  DO UPDATE SET ingredient_count = EXCLUDED.ingredient_count;

  -- Backfill canonical demo links between menu items and ingredients.
  INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, is_optional)
  SELECT
    mi.id,
    ing.id,
    '1 portion',
    false
  FROM (
    VALUES
      ('Classic Beef Burger', 'Prime Beef Patty'),
      ('Classic Beef Burger', 'Brioche Bun'),
      ('Grilled Salmon', 'Fresh Atlantic Salmon'),
      ('Grilled Salmon', 'Parmesan Cheese'),
      ('Garden Salad (V)', 'Vegetable Stock'),
      ('Caesar Salad', 'Caesar Dressing'),
      ('Caesar Salad', 'Parmesan Cheese'),
      ('Caesar Salad', 'Brioche Bun'),
      ('Chocolate Brownie', 'Chocolate Brownie Mix'),
      ('Seasonal Soup', 'Vegetable Stock'),
      ('Seasonal Soup', 'Brioche Bun'),
      ('Mushroom Risotto (V)', 'Mushroom Risotto Base'),
      ('Mushroom Risotto (V)', 'Parmesan Cheese'),
      ('Kids Fish Goujons', 'Fresh Atlantic Salmon'),
      ('Kids Fish Goujons', 'Brioche Bun')
  ) AS map(menu_name, ingredient_name)
  JOIN menu_items mi
    ON mi.business_id = v_business_id
   AND mi.name = map.menu_name
  JOIN ingredients ing
    ON ing.business_id = v_business_id
   AND ing.name = map.ingredient_name
  ON CONFLICT (menu_item_id, ingredient_id)
  DO NOTHING;

  -- Replace prior seeded analytics payload (idempotent by marker).
  DELETE FROM kiosk_analytics_events
  WHERE business_id = v_business_id
    AND scan_source = 'demo_seed_v1';

  IF to_regclass('public.pdf_download_events') IS NOT NULL THEN
    DELETE FROM pdf_download_events
    WHERE business_id = v_business_id
      AND download_type LIKE 'demo_seed_v1:%';
  END IF;

  -- Current 7-day period: stronger activity.
  WITH
  current_terms AS (
    SELECT ARRAY[
      'gluten free', 'milk', 'peanuts', 'vegan', 'sesame',
      'dairy free', 'eggs', 'fish', 'mustard', 'celery'
    ] AS terms
  ),
  current_dietary AS (
    SELECT ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'] AS terms
  ),
  current_allergens AS (
    SELECT ARRAY['contains_peanuts', 'contains_milk', 'contains_eggs', 'contains_sesame'] AS terms
  ),
  day_series AS (
    SELECT generate_series(0, 6) AS day_offset
  ),
  page_views AS (
    SELECT
      v_business_id AS business_id,
      NULL::uuid AS site_id,
      v_slug AS slug,
      'page_view'::text AS event_type,
      NULL::text AS search_query,
      ARRAY[]::text[] AS selected_allergens,
      NULL::text AS download_type,
      'demo_seed_v1'::text AS scan_source,
      (35 + day_offset)::int AS time_on_page,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => 1)) AS created_at
    FROM day_series
  ),
  searches AS (
    SELECT
      v_business_id AS business_id,
      NULL::uuid AS site_id,
      v_slug AS slug,
      'search'::text AS event_type,
      (
        SELECT terms[((day_offset + i) % array_length(terms, 1)) + 1]
        FROM current_terms
      )::text AS search_query,
      ARRAY[]::text[] AS selected_allergens,
      NULL::text AS download_type,
      'demo_seed_v1'::text AS scan_source,
      NULL::int AS time_on_page,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => (8 + i))) AS created_at
    FROM day_series
    JOIN LATERAL generate_series(1, 3 + (day_offset % 2)) AS i ON true
  ),
  filters AS (
    SELECT
      v_business_id AS business_id,
      NULL::uuid AS site_id,
      v_slug AS slug,
      'filter'::text AS event_type,
      (
        SELECT 'dietary:' || terms[(day_offset % array_length(terms, 1)) + 1]
        FROM current_dietary
      )::text AS search_query,
      ARRAY[
        (
          SELECT terms[(day_offset % array_length(terms, 1)) + 1]
          FROM current_allergens
        )
      ]::text[] AS selected_allergens,
      NULL::text AS download_type,
      'demo_seed_v1'::text AS scan_source,
      NULL::int AS time_on_page,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => 20)) AS created_at
    FROM day_series
  )
  INSERT INTO kiosk_analytics_events (
    business_id, site_id, slug, event_type, search_query,
    selected_allergens, download_type, scan_source, time_on_page, created_at
  )
  SELECT * FROM page_views
  UNION ALL
  SELECT * FROM searches
  UNION ALL
  SELECT * FROM filters;

  -- Previous 7-day period: lighter activity for meaningful deltas.
  WITH
  prev_terms AS (
    SELECT ARRAY['gluten', 'milk', 'fish', 'vegan', 'soy', 'nuts'] AS terms
  ),
  day_series AS (
    SELECT generate_series(8, 14) AS day_offset
  ),
  page_views AS (
    SELECT
      v_business_id AS business_id,
      NULL::uuid AS site_id,
      v_slug AS slug,
      'page_view'::text AS event_type,
      NULL::text AS search_query,
      ARRAY[]::text[] AS selected_allergens,
      NULL::text AS download_type,
      'demo_seed_v1'::text AS scan_source,
      (22 + day_offset)::int AS time_on_page,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => 2)) AS created_at
    FROM day_series
  ),
  searches AS (
    SELECT
      v_business_id AS business_id,
      NULL::uuid AS site_id,
      v_slug AS slug,
      'search'::text AS event_type,
      (
        SELECT terms[((day_offset + i) % array_length(terms, 1)) + 1]
        FROM prev_terms
      )::text AS search_query,
      ARRAY[]::text[] AS selected_allergens,
      NULL::text AS download_type,
      'demo_seed_v1'::text AS scan_source,
      NULL::int AS time_on_page,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => (9 + i))) AS created_at
    FROM day_series
    JOIN LATERAL generate_series(1, 1 + (day_offset % 2)) AS i ON true
  )
  INSERT INTO kiosk_analytics_events (
    business_id, site_id, slug, event_type, search_query,
    selected_allergens, download_type, scan_source, time_on_page, created_at
  )
  SELECT * FROM page_views
  UNION ALL
  SELECT * FROM searches;

  -- PDF downloads: current stronger, previous lighter.
  -- Guarded because some environments may not have pdf_download_events yet.
  IF to_regclass('public.pdf_download_events') IS NOT NULL THEN
    INSERT INTO pdf_download_events (business_id, site_id, user_id, download_type, created_at)
    SELECT
      v_business_id,
      NULL::uuid,
      v_owner_user_id,
      CASE WHEN day_offset % 2 = 0 THEN 'demo_seed_v1:allergen-guide' ELSE 'demo_seed_v1:menu-report' END,
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => 40))
    FROM generate_series(0, 6) AS day_offset;

    INSERT INTO pdf_download_events (business_id, site_id, user_id, download_type, created_at)
    SELECT
      v_business_id,
      NULL::uuid,
      v_owner_user_id,
      'demo_seed_v1:allergen-guide',
      (now() - make_interval(days => day_offset) + make_interval(hours => 12, mins => 42))
    FROM generate_series(8, 12) AS day_offset;
  ELSE
    RAISE NOTICE 'Skipping PDF demo seed because public.pdf_download_events does not exist';
  END IF;

  RAISE NOTICE 'Latte Larry''s demo patch complete for business id %', v_business_id;
END $$;
