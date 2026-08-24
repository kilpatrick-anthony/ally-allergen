-- Remove legacy development policies and consolidate overlapping permissive
-- policies. The service role bypasses RLS, so service-role-only access does not
-- need a permissive policy.

-- This table is a legacy backup and is not part of the application surface.
revoke all on table public.ingredients_old_backup from anon, authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ingredients_old_backup'
  loop
    execute format(
      'drop policy %I on public.ingredients_old_backup',
      policy_record.policyname
    );
  end loop;
end $$;

-- Duplicate and misleading service-role policies.
drop policy if exists "Users can view their businesses" on public.businesses;
drop policy if exists "Service role can insert businesses" on public.businesses;
alter policy "Users can view their associated businesses"
  on public.businesses to authenticated;
alter policy "Business owners can update their business"
  on public.businesses to authenticated;

drop policy if exists "Service role can insert compliance audits"
  on public.compliance_audit;

-- Device writes are handled by authenticated API routes using the service role.
drop policy if exists "Allow authenticated users to insert devices"
  on public.devices;
drop policy if exists "Allow authenticated users to update devices"
  on public.devices;
drop policy if exists "Users can view devices for their businesses"
  on public.devices;
drop policy if exists "Service role can manage devices"
  on public.devices;
revoke all on table public.devices from anon, authenticated;

-- Keep one tenant-scoped ingredient read policy.
drop policy if exists "ingredients" on public.ingredients;
alter policy "Users can view ingredients for their business"
  on public.ingredients to authenticated;
alter policy "Users can insert ingredients for their business"
  on public.ingredients to authenticated;
alter policy "Users can update ingredients for their business"
  on public.ingredients to authenticated;
alter policy "Users can delete ingredients for their business"
  on public.ingredients to authenticated;

-- Anonymous users may read active menu items. Signed-in users retain the
-- tenant-scoped read policy and tenant-scoped write access.
drop policy if exists "Enable all for authenticated users on menu_items"
  on public.menu_items;
drop policy if exists "Enable read access for all users"
  on public.menu_items;
drop policy if exists "menu_items_policy" on public.menu_items;
alter policy "Allow public read access to menu_items"
  on public.menu_items to anon;
alter policy "menu_items"
  on public.menu_items to authenticated;

-- Public site discovery is intentional. The broad read policy makes the three
-- tenant read policies redundant, while the explicit write policies remain.
alter policy "Allow public read access to sites"
  on public.sites to anon, authenticated;
drop policy if exists "Users can view their business sites" on public.sites;
drop policy if exists "Users can view their sites" on public.sites;
drop policy if exists "sites" on public.sites;
drop policy if exists "Business owners can manage their sites" on public.sites;
drop policy if exists "Service role can manage sites" on public.sites;

-- The service role bypasses RLS; users only need their self-read policy.
drop policy if exists "Service role can manage users" on public.users;
alter policy "Users can view their own data"
  on public.users to authenticated;

-- Convert ALL policies into write-only policies. This preserves their INSERT,
-- UPDATE and DELETE behaviour without making them overlap SELECT policies.
do $$
declare
  policy_record record;
  insert_check text;
  update_using text;
  update_check text;
  delete_using text;
begin
  for policy_record in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and cmd = 'ALL'
      and (
        (tablename = 'menu_items'
          and policyname = 'Business owners can manage menu items')
        or (tablename = 'notifications'
          and policyname = 'Users can update notifications for their businesses')
        or (tablename in (
          'training_certificates',
          'training_courses',
          'training_enrollments',
          'training_external_evidence',
          'training_module_progress',
          'training_modules',
          'training_notifications',
          'training_requirements'
        ) and policyname like 'training\_%\_write' escape '\')
      )
  loop
    insert_check := coalesce(policy_record.with_check, policy_record.qual, 'false');
    update_using := coalesce(policy_record.qual, 'false');
    update_check := coalesce(policy_record.with_check, policy_record.qual, 'false');
    delete_using := coalesce(policy_record.qual, 'false');

    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
    execute format(
      'create policy %I on %I.%I for insert to authenticated with check (%s)',
      policy_record.policyname || ' insert',
      policy_record.schemaname,
      policy_record.tablename,
      insert_check
    );
    execute format(
      'create policy %I on %I.%I for update to authenticated using (%s) with check (%s)',
      policy_record.policyname || ' update',
      policy_record.schemaname,
      policy_record.tablename,
      update_using,
      update_check
    );
    execute format(
      'create policy %I on %I.%I for delete to authenticated using (%s)',
      policy_record.policyname || ' delete',
      policy_record.schemaname,
      policy_record.tablename,
      delete_using
    );
  end loop;
end $$;

alter policy "Users can view notifications for their businesses"
  on public.notifications to authenticated;

alter policy "training_certificates_select"
  on public.training_certificates to authenticated;
alter policy "training_courses_select"
  on public.training_courses to authenticated;
alter policy "training_enrollments_select"
  on public.training_enrollments to authenticated;
alter policy "training_external_evidence_select"
  on public.training_external_evidence to authenticated;
alter policy "training_module_progress_select"
  on public.training_module_progress to authenticated;
alter policy "training_modules_select"
  on public.training_modules to authenticated;
alter policy "training_notifications_select"
  on public.training_notifications to authenticated;
alter policy "training_requirements_select"
  on public.training_requirements to authenticated;
