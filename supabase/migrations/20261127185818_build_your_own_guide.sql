-- A location can opt in one prepared menu item. Rows here are editable drafts.
create table public.site_bowl_configurations (
  site_id uuid primary key references public.sites(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object')
);
create index site_bowl_configurations_menu_item_idx on public.site_bowl_configurations(menu_item_id);
alter table public.site_bowl_configurations enable row level security;
revoke all on public.site_bowl_configurations from public, anon, authenticated;
grant select, insert, update, delete on public.site_bowl_configurations to service_role;

-- The ingredient catalogue is business-wide. Only the explicitly selected records
-- for this location are included, and managers review that they match stock there.
create function public.site_bowl_source(p_site uuid, p_business uuid, p_item uuid, p_config jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'configuration', p_config,
    'recipe', array(select distinct link.ingredient_id from public.menu_item_ingredients link
      where link.menu_item_id = item.id order by link.ingredient_id),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ingredient.id, 'name', ingredient.name, 'status', ingredient.status,
        'allergen_warnings', ingredient.allergen_warnings, 'supplier_profiles', ingredient.supplier_profiles,
        'certifications', ingredient.certifications, 'reviewedAt', ingredient.last_reviewed_at,
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', variant.id, 'supplierId', supplier.id, 'supplier', supplier.name, 'brand', variant.brand,
            'status', variant.assessment_status, 'warnings', variant.allergen_warnings,
            'certifications', variant.certifications, 'reviewedAt', variant.last_reviewed_at
          ) order by variant.id)
          from public.ingredient_supplier_variants variant
          left join public.suppliers supplier on supplier.id = variant.supplier_id and supplier.business_id = p_business
          where variant.ingredient_id = ingredient.id and variant.business_id = p_business
        ), '[]'::jsonb),
        'evidence', (select md5(coalesce(jsonb_agg(to_jsonb(spec) order by spec.id)::text, ''))
          from public.datasheets spec where spec.ingredient_id = ingredient.id and spec.business_id = p_business)
      ) order by ingredient.id)
      from public.ingredients ingredient
      where ingredient.business_id = p_business and ingredient.id in (
        select fixed::uuid from jsonb_array_elements_text(p_config->'fixed') fixed
        union
        select (case jsonb_typeof(option.value) when 'string' then option.value #>> '{}' else option.value->>'id' end)::uuid
        from jsonb_array_elements(p_config->'groups') groups
        cross join lateral jsonb_array_elements(groups->'options') option
        union
        select ingredient_id::uuid from jsonb_array_elements(p_config->'groups') groups
        cross join lateral jsonb_array_elements(groups->'options') option
        cross join lateral jsonb_array_elements_text(option.value->'additionalIngredientIds') ingredient_id
      )
    ), '[]'::jsonb)
  )
  from public.sites site
  join public.menu_items item on item.id = p_item and item.business_id = p_business
    and item.item_type = 'prepared' and item.is_active
    and (item.site_id is null or item.site_id = site.id)
  where site.id = p_site and site.business_id = p_business and site.is_active
$$;

create function public.save_site_bowl_configuration(
  p_site uuid, p_business uuid, p_item uuid, p_actor uuid, p_config jsonb, p_source jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.user_businesses
    where user_id = p_actor and business_id = p_business and role in ('owner', 'manager', 'staff')
  ) then raise exception 'Location edit permission required' using errcode = '42501'; end if;

  perform 1 from public.sites where id = p_site and business_id = p_business and (is_active or p_config is null) for update;
  if not found then raise exception 'Location not found' using errcode = '42501'; end if;

  if p_config is null then
    delete from public.site_bowl_configurations where site_id = p_site and menu_item_id = p_item;
    return;
  end if;

  if p_source is null or p_source is distinct from public.site_bowl_source(p_site, p_business, p_item, p_config) then
    raise exception 'Recipe or ingredients changed. Reopen the configuration and try again.' using errcode = '40001';
  end if;

  insert into public.site_bowl_configurations(site_id, menu_item_id, configuration) values (p_site, p_item, p_config)
  on conflict (site_id) do update set menu_item_id = excluded.menu_item_id, configuration = excluded.configuration
    where site_bowl_configurations.menu_item_id = excluded.menu_item_id or not exists (
      select 1 from public.menu_items current_item
      where current_item.id = site_bowl_configurations.menu_item_id and current_item.business_id = p_business
        and current_item.item_type = 'prepared' and current_item.is_active
        and (current_item.site_id is null or current_item.site_id = p_site)
    );
  if not found then raise exception 'This location already has a bowl configured on another item.' using errcode = '23505'; end if;
end
$$;

revoke all on function public.site_bowl_source(uuid,uuid,uuid,jsonb),
  public.save_site_bowl_configuration(uuid,uuid,uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.site_bowl_source(uuid,uuid,uuid,jsonb),
  public.save_site_bowl_configuration(uuid,uuid,uuid,uuid,jsonb,jsonb) to service_role;

-- Extend the existing location candidate in the same statement and fingerprint.
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
      ) || case when bowl.menu_item_id is not null and item.item_type = 'prepared' then
        jsonb_build_object('bowl_source', public.site_bowl_source(site.id, site.business_id, item.id, bowl.configuration))
      else '{}'::jsonb end order by item.display_order, item.id)
      from public.menu_items item
      left join public.suppliers supplier on supplier.id = item.supplier_id and supplier.business_id = site.business_id
      left join public.site_bowl_configurations bowl on bowl.site_id = site.id and bowl.menu_item_id = item.id
      where item.business_id = site.business_id and item.is_active
        and (item.site_id is null or item.site_id = site.id)
    ), '[]'::jsonb)
  )
  from public.sites site where site.id = p_site and site.business_id = p_business and site.is_active
$$;
