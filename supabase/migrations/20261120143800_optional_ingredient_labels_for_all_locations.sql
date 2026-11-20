alter table public.site_ppds_revisions
  drop constraint site_ppds_revisions_jurisdiction_check,
  add constraint site_ppds_revisions_jurisdiction_check
    check (jurisdiction in ('IE', 'NI', 'ENG', 'WAL', 'SCT')),
  drop constraint site_ppds_revisions_classification_check,
  add constraint site_ppds_revisions_classification_check
    check (classification in ('loose', 'distance', 'ppds', 'review', 'ingredient_label')),
  drop constraint site_ppds_revisions_check,
  add constraint site_ppds_revisions_check
    check (label is null or classification in ('ppds', 'ingredient_label'));

create or replace function public.site_ppds_source(p_site uuid, p_business uuid, p_item uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'jurisdiction', site.jurisdiction,
    'item', jsonb_build_object('id', item.id, 'name', item.name, 'site_id', item.site_id,
      'business_id', item.business_id, 'updated_at', item.updated_at, 'item_type', item.item_type,
      'supplier_id', item.supplier_id, 'allergen_warnings', item.allergen_warnings,
      'ingredient_declaration', item.ingredient_declaration),
    'directSupplier', (select jsonb_build_object('id', supplier.id, 'name', supplier.name)
      from public.suppliers supplier where supplier.id = item.supplier_id and supplier.business_id = p_business),
    'recipeLinkCount', (select count(*) from public.menu_item_ingredients link where link.menu_item_id = item.id),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'link', to_jsonb(link),
        'ingredient', to_jsonb(ingredient)
      ) order by ingredient.id)
      from public.menu_item_ingredients link
      join public.ingredients ingredient on ingredient.id = link.ingredient_id
      where link.menu_item_id = item.id and ingredient.business_id = p_business
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object('variant', to_jsonb(variant), 'supplier', to_jsonb(supplier)) order by variant.id)
      from public.ingredient_supplier_variants variant
      join public.suppliers supplier on supplier.id = variant.supplier_id and supplier.business_id = p_business
      where variant.business_id = p_business and exists (
        select 1 from public.menu_item_ingredients link
        where link.menu_item_id = item.id and link.ingredient_id = variant.ingredient_id
      )
    ), '[]'::jsonb),
    'specifications', coalesce((
      select jsonb_agg(to_jsonb(specification) order by specification.id)
      from public.datasheets specification
      where specification.business_id = p_business and (
        specification.menu_item_id = item.id or exists (
          select 1 from public.menu_item_ingredients link
          where link.menu_item_id = item.id and link.ingredient_id = specification.ingredient_id
        )
      )
    ), '[]'::jsonb)
  )
  from public.sites site
  join public.menu_items item on item.id = p_item and item.business_id = site.business_id
    and item.is_active and (item.site_id is null or item.site_id = site.id)
  where site.id = p_site and site.business_id = p_business and site.is_active
$$;

create or replace function public.site_ppds_overview(p_site uuid, p_business uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId', review.menu_item_id,
    'state', case
      when review.classification = 'review' then 'review'
      when review.label is null then review.classification
      when md5(public.site_ppds_source(p_site, p_business, review.menu_item_id)::text) is distinct from review.source_fingerprint
        or exists (
          select 1 from jsonb_array_elements(review.label->'input'->'specifications') as choice
          join public.datasheets spec on spec.id::text = choice->>'documentId' and spec.business_id = p_business
          where spec.next_review_date is null or spec.next_review_date < timezone('Europe/London', now())::date
        ) then 'review'
      else 'approved'
    end
  )), '[]'::jsonb)
  from (
    select distinct on (revision.menu_item_id) revision.menu_item_id, revision.classification,
      revision.label, revision.source_fingerprint
    from public.site_ppds_revisions revision
    join public.sites site on site.id = revision.site_id and site.business_id = p_business
    where revision.site_id = p_site and site.is_active
    order by revision.menu_item_id, revision.recorded_at desc, revision.id desc
  ) review
$$;
