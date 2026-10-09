-- Website links use the app's JWT-authenticated API, not direct browser access.
create table public.website_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  placement text not null default '' check (char_length(placement) <= 200),
  created_at timestamptz not null default now()
);

create index website_links_business_created_idx
  on public.website_links (business_id, created_at desc);
create index website_links_site_idx on public.website_links (site_id);

alter table public.website_links enable row level security;
revoke all on public.website_links from public, anon, authenticated;
grant select, insert, update, delete on public.website_links to service_role;

-- Preserve the location links previously generated automatically by the page.
-- Their original URLs also continue to work.
insert into public.website_links (business_id, site_id, name)
select business_id, id, left(coalesce(nullif(btrim(name), ''), 'Website link'), 100)
from public.sites;
