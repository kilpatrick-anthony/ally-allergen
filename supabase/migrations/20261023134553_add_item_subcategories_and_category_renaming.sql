-- Existing categories and recipes are preserved; subcategories are optional.
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '';
ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_subcategory_parent CHECK (subcategory = '' OR length(btrim(coalesce(category, ''))) > 0);
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_subcategory_parent CHECK (subcategory = '' OR length(btrim(coalesce(category, ''))) > 0);

-- One transaction updates every member and its audit history. Only the server
-- service role can call this function, after checking the authenticated actor.
CREATE OR REPLACE FUNCTION public.rename_item_category(
  p_business_id uuid, p_user_id uuid, p_user_email text, p_kind text,
  p_category text, p_subcategory text, p_new_name text
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_table text; v_field text; v_old text; v_name text; v_exists boolean;
  v_count integer := 0; v_row record; v_display_name text;
BEGIN
  IF p_kind NOT IN ('ingredients', 'menu-items') OR p_kind IS NULL THEN
    RAISE EXCEPTION 'Invalid collection' USING ERRCODE = '22023';
  END IF;
  v_table := CASE WHEN p_kind = 'ingredients' THEN 'ingredients' ELSE 'menu_items' END;
  v_field := CASE WHEN p_subcategory IS NULL THEN 'category' ELSE 'subcategory' END;
  v_old := coalesce(p_subcategory, p_category, ''); v_name := btrim(p_new_name);
  IF v_name IS NULL OR length(v_name) = 0 OR length(v_name) > 100 OR v_name ~ '[[:cntrl:]]'
    OR (p_subcategory IS NOT NULL AND (btrim(p_subcategory) = '' OR btrim(coalesce(p_category, '')) = '')) THEN
    RAISE EXCEPTION 'Invalid category name' USING ERRCODE = '22023';
  END IF;
  SELECT display_name INTO v_display_name FROM public.user_businesses
    WHERE business_id = p_business_id AND user_id = p_user_id AND role IN ('owner', 'manager', 'staff');
  IF NOT FOUND THEN RAISE EXCEPTION 'Business membership required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_business_id::text), hashtext(p_kind));
  IF v_name = v_old THEN RETURN 0; END IF;
  IF p_subcategory IS NULL THEN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE business_id=$1 AND lower(category)=lower($2) AND coalesce(category,'''')<>$3)', v_table)
      INTO v_exists USING p_business_id, v_name, coalesce(p_category, '');
  ELSE
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE business_id=$1 AND coalesce(category,'''')=$2 AND lower(subcategory)=lower($3) AND subcategory<>$4)', v_table)
      INTO v_exists USING p_business_id, p_category, v_name, p_subcategory;
  END IF;
  IF v_exists THEN RAISE EXCEPTION 'That category name already exists' USING ERRCODE = '23505'; END IF;
  FOR v_row IN EXECUTE format('UPDATE public.%I SET %I=$1, updated_at=now() WHERE business_id=$2 AND coalesce(category,'''')=$3 %s RETURNING id,name',
    v_table, v_field, CASE WHEN p_subcategory IS NULL THEN '' ELSE 'AND subcategory=$4' END)
    USING v_name, p_business_id, coalesce(p_category, ''), p_subcategory
  LOOP
    INSERT INTO public.audit_log (business_id,entity_type,entity_id,entity_name,action,changes,changed_by,changed_by_email,changed_by_name)
    VALUES (p_business_id,CASE WHEN p_kind='ingredients' THEN 'ingredient' ELSE 'menu_item' END,v_row.id,v_row.name,'updated',
      jsonb_build_array(jsonb_build_object('field',v_field,'label',CASE WHEN v_field='category' THEN 'Category' ELSE 'Subcategory' END,'from',v_old,'to',v_name)),
      p_user_id,p_user_email,v_display_name);
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'Category not found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.rename_item_category(uuid,uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_item_category(uuid,uuid,text,text,text,text,text) TO service_role;
