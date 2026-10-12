-- The authenticated application API checks business membership, ownership and
-- draft status before deleting. Browser roles retain no direct table access.
grant delete on public.quick_add_drafts to service_role;
