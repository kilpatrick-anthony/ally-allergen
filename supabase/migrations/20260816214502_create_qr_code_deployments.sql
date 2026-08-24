-- Recorded remotely as migration 20260816214502.
-- QR codes are durable access points for a site. They intentionally remain
-- separate from physical devices because they have no pairing or heartbeat.
create table public.qr_code_deployments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  placement text not null default '',
  public_code uuid not null default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'inactive')),
  scan_count bigint not null default 0,
  last_scanned_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_code_deployments_business_public_code_unique unique (business_id, public_code)
);

create index qr_code_deployments_business_idx
  on public.qr_code_deployments (business_id);
create index qr_code_deployments_site_idx
  on public.qr_code_deployments (site_id);
create unique index qr_code_deployments_public_code_idx
  on public.qr_code_deployments (public_code);

create table public.qr_code_deployment_scans (
  id bigint generated always as identity primary key,
  deployment_id uuid not null references public.qr_code_deployments(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  user_agent text,
  referrer text
);

create index qr_code_deployment_scans_deployment_scanned_idx
  on public.qr_code_deployment_scans (deployment_id, scanned_at desc);

create or replace function public.update_qr_deployment_scan_stats()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.qr_code_deployments
  set scan_count = scan_count + 1,
      last_scanned_at = new.scanned_at
  where id = new.deployment_id;
  return new;
end;
$$;

revoke all on function public.update_qr_deployment_scan_stats() from public, anon, authenticated;
grant execute on function public.update_qr_deployment_scan_stats() to service_role;

create trigger qr_code_deployment_scan_stats
after insert on public.qr_code_deployment_scans
for each row execute function public.update_qr_deployment_scan_stats();

alter table public.qr_code_deployments enable row level security;
alter table public.qr_code_deployment_scans enable row level security;

revoke all on public.qr_code_deployments from anon;
revoke all on public.qr_code_deployment_scans from anon;
grant select, insert, update, delete on public.qr_code_deployments to authenticated;
grant select on public.qr_code_deployment_scans to authenticated;
grant all on public.qr_code_deployments to service_role;
grant all on public.qr_code_deployment_scans to service_role;
grant usage, select on sequence public.qr_code_deployment_scans_id_seq to service_role;

create policy "Business members can view QR deployments"
  on public.qr_code_deployments for select to authenticated
  using (
    exists (
      select 1 from public.user_businesses membership
      where membership.business_id = qr_code_deployments.business_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Business members can create QR deployments"
  on public.qr_code_deployments for insert to authenticated
  with check (
    exists (
      select 1 from public.user_businesses membership
      where membership.business_id = qr_code_deployments.business_id
        and membership.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.sites site
      where site.id = qr_code_deployments.site_id
        and site.business_id = qr_code_deployments.business_id
    )
  );

create policy "Business members can update QR deployments"
  on public.qr_code_deployments for update to authenticated
  using (
    exists (
      select 1 from public.user_businesses membership
      where membership.business_id = qr_code_deployments.business_id
        and membership.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.user_businesses membership
      where membership.business_id = qr_code_deployments.business_id
        and membership.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.sites site
      where site.id = qr_code_deployments.site_id
        and site.business_id = qr_code_deployments.business_id
    )
  );

create policy "Business managers can delete QR deployments"
  on public.qr_code_deployments for delete to authenticated
  using (
    exists (
      select 1 from public.user_businesses membership
      where membership.business_id = qr_code_deployments.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'manager')
    )
  );

create policy "Business members can view QR scan events"
  on public.qr_code_deployment_scans for select to authenticated
  using (
    exists (
      select 1
      from public.qr_code_deployments deployment
      join public.user_businesses membership
        on membership.business_id = deployment.business_id
      where deployment.id = qr_code_deployment_scans.deployment_id
        and membership.user_id = (select auth.uid())
    )
  );
