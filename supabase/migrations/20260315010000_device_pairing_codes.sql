-- Unique version assigned during migration-history reconciliation.
-- Device pairing codes table
-- Admins generate a short-lived code in the portal; staff enter it on the kiosk
-- to automatically configure site_id and register the device.

CREATE TABLE IF NOT EXISTS device_pairing_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        UNIQUE NOT NULL,          -- e.g. 'ALLY-7B3K'
  device_id    UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  site_id      UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,                -- 24 hours from creation
  redeemed     BOOLEAN     NOT NULL DEFAULT false,
  redeemed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dpc_code        ON device_pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_dpc_device_id   ON device_pairing_codes(device_id);
CREATE INDEX IF NOT EXISTS idx_dpc_business_id ON device_pairing_codes(business_id);

-- RLS: all access via service-role key (API routes)
ALTER TABLE device_pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pairing codes"
  ON device_pairing_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
