-- Recorded remotely as migration 20260816212539.
-- Normalize the supplier-specific safety profile for an ingredient.
-- Legacy ingredients.suppliers and ingredients.supplier_profiles remain in place
-- during the transition because kiosk/PDF consumers still read them.

alter table public.ingredients
  add column if not exists supplier_profiles jsonb not null default '{}'::jsonb;

create table if not exists public.ingredient_supplier_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  allergen_warnings jsonb not null default '{}'::jsonb,
  certifications text[] not null default array[]::text[],
  assessment_status text not null default 'needs_review',
  notes text not null default '',
  last_reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_supplier_variants_unique unique (ingredient_id, supplier_id),
  constraint ingredient_supplier_variants_assessment_status_check
    check (assessment_status in ('needs_review', 'assessed')),
  constraint ingredient_supplier_variants_allergen_warnings_object_check
    check (jsonb_typeof(allergen_warnings) = 'object')
);

create index if not exists ingredient_supplier_variants_business_idx
  on public.ingredient_supplier_variants (business_id);

create index if not exists ingredient_supplier_variants_ingredient_idx
  on public.ingredient_supplier_variants (ingredient_id);

create index if not exists ingredient_supplier_variants_supplier_idx
  on public.ingredient_supplier_variants (supplier_id);

-- Existing named supplier profiles are considered assessed. Older links without
-- a profile inherit the ingredient's effective values, but remain visibly marked
-- as needing review rather than being treated as allergen-free.
insert into public.ingredient_supplier_variants (
  business_id,
  ingredient_id,
  supplier_id,
  allergen_warnings,
  certifications,
  assessment_status,
  created_by
)
select
  ingredient.business_id,
  ingredient.id,
  supplier.id,
  case
    when ingredient.supplier_profiles ? supplier_name.name
      then coalesce(
        ingredient.supplier_profiles -> supplier_name.name -> 'allergen_warnings',
        ingredient.allergen_warnings,
        '{}'::jsonb
      )
    else coalesce(ingredient.allergen_warnings, '{}'::jsonb)
  end,
  case
    when ingredient.supplier_profiles ? supplier_name.name
      then coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(
              ingredient.supplier_profiles -> supplier_name.name -> 'certifications',
              '[]'::jsonb
            )
          )
        ),
        array[]::text[]
      )
    else coalesce(ingredient.certifications, array[]::text[])
  end,
  case
    when ingredient.supplier_profiles ? supplier_name.name then 'assessed'
    else 'needs_review'
  end,
  ingredient.created_by
from public.ingredients ingredient
cross join lateral unnest(coalesce(ingredient.suppliers, array[]::text[])) supplier_name(name)
join public.suppliers supplier
  on supplier.business_id = ingredient.business_id
 and lower(trim(supplier.name)) = lower(trim(supplier_name.name))
on conflict (ingredient_id, supplier_id) do nothing;

alter table public.ingredient_supplier_variants enable row level security;

revoke all on public.ingredient_supplier_variants from anon;
grant select, insert, update, delete on public.ingredient_supplier_variants to authenticated;
grant all on public.ingredient_supplier_variants to service_role;

drop policy if exists "Business members can view ingredient supplier variants"
  on public.ingredient_supplier_variants;
create policy "Business members can view ingredient supplier variants"
  on public.ingredient_supplier_variants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_businesses membership
      where membership.business_id = ingredient_supplier_variants.business_id
        and membership.user_id = (select auth.uid())
    )
  );

drop policy if exists "Business members can create ingredient supplier variants"
  on public.ingredient_supplier_variants;
create policy "Business members can create ingredient supplier variants"
  on public.ingredient_supplier_variants
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_businesses membership
      where membership.business_id = ingredient_supplier_variants.business_id
        and membership.user_id = (select auth.uid())
    )
  );

drop policy if exists "Business members can update ingredient supplier variants"
  on public.ingredient_supplier_variants;
create policy "Business members can update ingredient supplier variants"
  on public.ingredient_supplier_variants
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_businesses membership
      where membership.business_id = ingredient_supplier_variants.business_id
        and membership.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.user_businesses membership
      where membership.business_id = ingredient_supplier_variants.business_id
        and membership.user_id = (select auth.uid())
    )
  );

drop policy if exists "Business managers can delete ingredient supplier variants"
  on public.ingredient_supplier_variants;
create policy "Business managers can delete ingredient supplier variants"
  on public.ingredient_supplier_variants
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_businesses membership
      where membership.business_id = ingredient_supplier_variants.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'manager')
    )
  );

-- Keep transitional name-based fields coherent when a supplier is renamed.
create or replace function public.sync_supplier_name_references()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.name is not distinct from old.name then
    return new;
  end if;

  update public.ingredients
  set
    suppliers = array(
      select case when supplier_name = old.name then new.name else supplier_name end
      from unnest(coalesce(suppliers, array[]::text[])) supplier_name
    ),
    supplier_profiles = case
      when coalesce(supplier_profiles, '{}'::jsonb) ? old.name
        then (supplier_profiles - old.name)
          || jsonb_build_object(new.name, supplier_profiles -> old.name)
      else coalesce(supplier_profiles, '{}'::jsonb)
    end,
    updated_at = now()
  where business_id = old.business_id
    and old.name = any(coalesce(suppliers, array[]::text[]));

  update public.datasheets
  set supplier_name = new.name,
      updated_at = now()
  where business_id = old.business_id
    and supplier_name = old.name;

  return new;
end;
$$;

revoke all on function public.sync_supplier_name_references() from public, anon, authenticated;
grant execute on function public.sync_supplier_name_references() to service_role;

drop trigger if exists suppliers_sync_name_references on public.suppliers;
create trigger suppliers_sync_name_references
after update of name on public.suppliers
for each row
execute function public.sync_supplier_name_references();
