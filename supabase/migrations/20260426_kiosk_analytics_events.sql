CREATE TABLE IF NOT EXISTS kiosk_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  slug TEXT,
  event_type TEXT NOT NULL,
  search_query TEXT,
  selected_allergens TEXT[] DEFAULT '{}',
  download_type TEXT,
  scan_source TEXT,
  time_on_page INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiosk_analytics_events_business_created
  ON kiosk_analytics_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_analytics_events_site_created
  ON kiosk_analytics_events (site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_analytics_events_type_created
  ON kiosk_analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_analytics_events_search_query
  ON kiosk_analytics_events (search_query);
