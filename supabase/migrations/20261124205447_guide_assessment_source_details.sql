-- Include source identities in the same snapshot as the publication fingerprint.
create or replace function public.site_allergen_candidate(p_site uuid, p_business uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'jurisdiction', site.jurisdiction,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'business_id', item.business_id, 'name', item.name,
        'description', item.description, 'category', item.category,
        'subcategory', item.subcategory, 'display_order', item.display_order,
        'price', item.price, 'is_active', item.is_active, 'color', item.color,
        'icon', item.icon, 'dietary', item.dietary, 'item_type', item.item_type,
        'manufacturer', item.manufacturer, 'supplier_name', supplier.name,
        'allergen_warnings', item.allergen_warnings,
        'ingredient_assessments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ingredient.id, 'name', ingredient.name,
            'allergen_warnings', ingredient.allergen_warnings, 'status', ingredient.status,
            'supplier_profiles', ingredient.supplier_profiles
          ) order by link.ingredient_id)
          from public.menu_item_ingredients link
          left join public.ingredients ingredient on ingredient.id = link.ingredient_id and ingredient.business_id = site.business_id
          where link.menu_item_id = item.id
        ), '[]'::jsonb),
        'ingredient_names', array(
          select distinct ingredient.name
          from public.menu_item_ingredients link
          join public.ingredients ingredient on ingredient.id = link.ingredient_id
          where link.menu_item_id = item.id and ingredient.business_id = site.business_id
          order by ingredient.name
        )
      ) order by item.display_order, item.id)
      from public.menu_items item
      left join public.suppliers supplier on supplier.id = item.supplier_id and supplier.business_id = site.business_id
      where item.business_id = site.business_id and item.is_active
        and (item.site_id is null or item.site_id = site.id)
    ), '[]'::jsonb)
  )
  from public.sites site where site.id = p_site and site.business_id = p_business and site.is_active
$$;
