-- Historic events remain unattributed; new clients send consented session context.
alter table public.kiosk_analytics_events
  add column source text not null default 'unknown'
    check (source in ('website', 'qr', 'kiosk', 'direct', 'unknown')),
  add column access_point_id uuid,
  add column session_id uuid,
  add column result_count integer check (result_count >= 0),
  add column filters_active boolean;

-- Deliberately no FK on access_point_id: it can refer to a website link, QR
-- deployment or device, and historical activity survives access-point removal.
comment on column public.kiosk_analytics_events.session_id is
  'Random per-tab browsing session; expires after 30 minutes of inactivity or kiosk reset. Not a unique person.';
comment on column public.kiosk_analytics_events.access_point_id is
  'Server-validated website link id, QR public_code or paired device id; scoped to business and site.';
