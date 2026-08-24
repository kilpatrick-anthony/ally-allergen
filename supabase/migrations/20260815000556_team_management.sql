-- Recorded remotely as migration 20260815000556.
-- Team membership names and immutable actor names for audit reports.
alter table public.user_businesses
  add column if not exists display_name text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz not null default now();

create index if not exists idx_user_businesses_invited_by
  on public.user_businesses (invited_by);

update public.user_businesses ub
set display_name = coalesce(
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  split_part(u.email, '@', 1)
)
from auth.users u
where u.id = ub.user_id
  and nullif(trim(ub.display_name), '') is null;

alter table public.audit_log
  add column if not exists changed_by_name text;

update public.audit_log al
set changed_by_name = coalesce(
  (
    select nullif(trim(ub.display_name), '')
    from public.user_businesses ub
    where ub.user_id = al.changed_by and ub.business_id = al.business_id
    limit 1
  ),
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  split_part(u.email, '@', 1)
)
from auth.users u
where u.id = al.changed_by
  and al.changed_by_name is null;

-- Keep direct browser access limited to a user's own membership. Team management
-- is performed through owner-authorized server routes using the service role.
drop policy if exists "Users can view own business association" on public.user_businesses;
drop policy if exists "Users can view their own business associations" on public.user_businesses;
drop policy if exists "Business owners and admins can invite users" on public.user_businesses;
drop policy if exists "Business owners can remove team members" on public.user_businesses;
drop policy if exists "Business owners can update roles" on public.user_businesses;
drop policy if exists "Service role can insert user_businesses" on public.user_businesses;

create policy "Users can view own business association"
  on public.user_businesses for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.user_businesses to authenticated;
grant select, insert on public.audit_log to authenticated;
