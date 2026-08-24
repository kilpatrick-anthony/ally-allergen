-- These legacy/internal tables are only accessed by server routes through the
-- service role. Keep them in the public schema for compatibility, but remove
-- direct Data API access and enforce RLS as defense in depth.
alter table public.menu_item_ingredients enable row level security;
alter table public.user_sessions enable row level security;
alter table public.qr_code_scans enable row level security;
alter table public.page_views enable row level security;
alter table public.site_menus enable row level security;
alter table public.site_menu_items enable row level security;

revoke all on table
  public.menu_item_ingredients,
  public.user_sessions,
  public.qr_code_scans,
  public.page_views,
  public.site_menus,
  public.site_menu_items
from anon, authenticated;

grant all on table
  public.menu_item_ingredients,
  public.user_sessions,
  public.qr_code_scans,
  public.page_views,
  public.site_menus,
  public.site_menu_items
to service_role;

-- Trigger functions do not need to be exposed as RPC endpoints. Pin their
-- search paths and restrict direct execution while preserving trigger use.
alter function public.update_updated_at_column() set search_path = '';
alter function public.update_user_businesses_updated_at() set search_path = '';
alter function public.update_devices_updated_at() set search_path = '';
alter function public.update_businesses_updated_at() set search_path = '';
alter function public.update_notifications_updated_at() set search_path = '';
alter function public.set_training_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';

revoke all on function
  public.update_updated_at_column(),
  public.update_user_businesses_updated_at(),
  public.update_devices_updated_at(),
  public.update_businesses_updated_at(),
  public.update_notifications_updated_at(),
  public.set_training_updated_at(),
  public.handle_new_user()
from public, anon, authenticated;

grant execute on function
  public.update_updated_at_column(),
  public.update_user_businesses_updated_at(),
  public.update_devices_updated_at(),
  public.update_businesses_updated_at(),
  public.update_notifications_updated_at(),
  public.set_training_updated_at(),
  public.handle_new_user()
to service_role;

-- This unused legacy reporting function does not need elevated privileges.
-- A fixed path keeps its existing unqualified references deterministic.
alter function public.get_overdue_notifications(uuid, uuid)
  security invoker
  set search_path = public, pg_temp;

revoke all on function public.get_overdue_notifications(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_overdue_notifications(uuid, uuid)
  to service_role;
