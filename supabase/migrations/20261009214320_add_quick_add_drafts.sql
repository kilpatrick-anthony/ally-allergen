-- Text-only delivery captures. These never enter ingredient/menu queries.
create table public.quick_add_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('ingredient', 'packaged_product')),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  site_id uuid references public.sites(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null default '' check (char_length(supplier_name) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'draft' check (status = 'draft'),
  version integer not null default 1 check (version >= 1),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quick_add_drafts_business_created_idx on public.quick_add_drafts (business_id, created_at desc, id desc);
create index quick_add_drafts_creator_business_idx on public.quick_add_drafts (created_by, business_id, created_at desc, id desc);
create index quick_add_drafts_site_idx on public.quick_add_drafts (site_id);
create index quick_add_drafts_supplier_idx on public.quick_add_drafts (supplier_id);
create index quick_add_drafts_updated_by_idx on public.quick_add_drafts (updated_by);

-- AllyJen uses an application session cookie. Access is through the server API,
-- which checks live membership and ownership on every request.
alter table public.quick_add_drafts enable row level security;
revoke all on public.quick_add_drafts from public, anon, authenticated, service_role;
grant select, insert, update on public.quick_add_drafts to service_role;

comment on table public.quick_add_drafts is
  'Unassessed Quick Add captures. Not ingredients or menu items; approval and publication are separate later workflows.';
