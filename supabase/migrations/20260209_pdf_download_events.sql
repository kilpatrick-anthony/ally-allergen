-- Track individual PDF download events for analytics
CREATE TABLE IF NOT EXISTS pdf_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  download_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pdf_download_events_business_id_idx
  ON pdf_download_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pdf_download_events_site_id_idx
  ON pdf_download_events(site_id, created_at DESC);

ALTER TABLE pdf_download_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert pdf download events for their business"
  ON pdf_download_events FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view pdf download events for their business"
  ON pdf_download_events FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );
