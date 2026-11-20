alter table public.sites
  add column jurisdiction text not null default 'IE'
  check (jurisdiction in ('IE', 'NI', 'ENG', 'WAL', 'SCT'));

create table public.site_allergen_publications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  jurisdiction text not null check (jurisdiction in ('IE', 'NI', 'ENG', 'WAL', 'SCT')),
  published_at timestamptz not null default clock_timestamp(),
  published_by uuid not null,
  items jsonb not null check (jsonb_typeof(items) = 'array')
);
create index site_allergen_publications_latest_idx on public.site_allergen_publications (site_id, published_at desc, id desc);
alter table public.site_allergen_publications enable row level security;
revoke all on public.site_allergen_publications from public, anon, authenticated;
grant select, insert on public.site_allergen_publications to service_role;

create table public.site_ppds_revisions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  menu_item_id uuid not null,
  jurisdiction text not null check (jurisdiction in ('NI', 'ENG', 'WAL', 'SCT')),
  classification text not null check (classification in ('loose', 'distance', 'ppds', 'review')),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{32}$'),
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  label jsonb check (label is null or jsonb_typeof(label) = 'object'),
  recorded_by uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  check (label is null or classification = 'ppds')
);
create index site_ppds_revisions_latest_idx on public.site_ppds_revisions (site_id, menu_item_id, recorded_at desc, id desc);
alter table public.site_ppds_revisions enable row level security;
revoke all on public.site_ppds_revisions from public, anon, authenticated;
grant select, insert on public.site_ppds_revisions to service_role;

-- The snapshot includes only data used by the customer menu and its printout.
-- The location constraint applies to shared and location-specific items.
create function public.site_allergen_candidate(p_site uuid, p_business uuid)
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

create function public.publish_site_allergens(p_site uuid, p_business uuid, p_actor uuid, p_expected text, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare candidate jsonb; previous public.site_allergen_publications; publication_id uuid;
begin
  if not exists (
    select 1 from public.user_businesses
    where user_id = p_actor and business_id = p_business and role in ('owner', 'manager')
  ) then raise exception 'Location approval permission required' using errcode = '42501'; end if;

  perform 1 from public.sites where id = p_site and business_id = p_business and is_active for update;
  candidate := public.site_allergen_candidate(p_site, p_business);
  if candidate is null or md5(candidate::text) is distinct from p_expected then
    raise exception 'Menu changed. Reload and review the current data.' using errcode = '40001';
  end if;

  select * into previous from public.site_allergen_publications
  where site_id = p_site order by published_at desc, id desc limit 1;
  if previous.items = p_items and previous.jurisdiction = candidate->>'jurisdiction' then return previous.id; end if;

  insert into public.site_allergen_publications(site_id, jurisdiction, published_by, items)
  values (p_site, candidate->>'jurisdiction', p_actor, p_items)
  returning id into publication_id;
  return publication_id;
end;
$$;

create function public.review_site_allergens(p_site uuid, p_business uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select candidate || jsonb_build_object('fingerprint', md5(candidate::text))
  from (select public.site_allergen_candidate(p_site, p_business) candidate) review
$$;

-- The complete source snapshot remains attached to every recorded revision.
-- Recipe links, supplier records, variants and specification metadata are read
-- together in a single database snapshot so their fingerprint is reproducible.
create function public.site_ppds_source(p_site uuid, p_business uuid, p_item uuid)
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
  where site.id = p_site and site.business_id = p_business and site.is_active and site.jurisdiction <> 'IE'
$$;

create function public.review_site_ppds_source(p_site uuid, p_business uuid, p_item uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('source', source, 'fingerprint', md5(source::text))
  from (select public.site_ppds_source(p_site, p_business, p_item) source) review
$$;

create function public.site_ppds_overview(p_site uuid, p_business uuid)
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
    where revision.site_id = p_site and site.is_active and site.jurisdiction <> 'IE'
    order by revision.menu_item_id, revision.recorded_at desc, revision.id desc
  ) review
$$;

create function public.record_site_ppds_revision(
  p_site uuid, p_business uuid, p_item uuid, p_actor uuid, p_previous uuid,
  p_expected text, p_classification text, p_answers jsonb, p_label jsonb
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_source jsonb; previous public.site_ppds_revisions; revision_id uuid;
begin
  if not exists (
    select 1 from public.user_businesses
    where user_id = p_actor and business_id = p_business and role in ('owner', 'manager')
  ) then raise exception 'Location approval permission required' using errcode = '42501'; end if;

  perform 1 from public.sites where id = p_site and business_id = p_business and is_active for update;
  current_source := public.site_ppds_source(p_site, p_business, p_item);
  if current_source is null or md5(current_source::text) is distinct from p_expected then
    raise exception 'Recipe or supplier data changed. Reload the item and review its sources.' using errcode = '40001';
  end if;

  select * into previous from public.site_ppds_revisions
  where site_id = p_site and menu_item_id = p_item order by recorded_at desc, id desc limit 1;

  if previous.id is distinct from p_previous then
    raise exception 'This item has a newer review. Reload it before saving.' using errcode = '40001';
  end if;
  if previous.classification = p_classification and previous.answers = p_answers
    and previous.source = current_source and previous.label is not distinct from p_label then return previous.id; end if;

  insert into public.site_ppds_revisions(site_id, menu_item_id, jurisdiction, classification, answers, source_fingerprint, source, label, recorded_by)
  values (p_site, p_item, current_source->>'jurisdiction', p_classification, p_answers, p_expected, current_source, p_label, p_actor)
  returning id into revision_id;
  return revision_id;
end;
$$;

revoke all on function public.site_allergen_candidate(uuid, uuid),
  public.review_site_allergens(uuid, uuid), public.publish_site_allergens(uuid, uuid, uuid, text, jsonb),
  public.site_ppds_source(uuid, uuid, uuid), public.review_site_ppds_source(uuid, uuid, uuid),
  public.site_ppds_overview(uuid, uuid),
  public.record_site_ppds_revision(uuid, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.site_allergen_candidate(uuid, uuid),
  public.review_site_allergens(uuid, uuid), public.publish_site_allergens(uuid, uuid, uuid, text, jsonb),
  public.site_ppds_source(uuid, uuid, uuid), public.review_site_ppds_source(uuid, uuid, uuid),
  public.site_ppds_overview(uuid, uuid),
  public.record_site_ppds_revision(uuid, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb)
  to service_role;
