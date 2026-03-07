CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'status') THEN
    ALTER TABLE businesses ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE businesses ADD CONSTRAINT businesses_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'contact_email') THEN
    ALTER TABLE businesses ADD COLUMN contact_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'settings') THEN
    ALTER TABLE businesses ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;

  -- Trial and subscription fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'plan_type') THEN
    ALTER TABLE businesses ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'trial';
    ALTER TABLE businesses ADD CONSTRAINT businesses_plan_type_check CHECK (plan_type IN ('trial', 'free', 'starter', 'pro', 'enterprise'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'trial_started_at') THEN
    ALTER TABLE businesses ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE businesses ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'subscription_started_at') THEN
    ALTER TABLE businesses ADD COLUMN subscription_started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'pdf_download_count') THEN
    ALTER TABLE businesses ADD COLUMN pdf_download_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'last_pdf_download_at') THEN
    ALTER TABLE businesses ADD COLUMN last_pdf_download_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
CREATE POLICY "Users can view their businesses"
  ON businesses
  FOR SELECT
  USING (
    id IN (
      SELECT business_id 
      FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can update their business" ON businesses;
CREATE POLICY "Business owners can update their business"
  ON businesses
  FOR UPDATE
  USING (
    id IN (
      SELECT business_id 
      FROM user_businesses 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Service role can insert businesses" ON businesses;
CREATE POLICY "Service role can insert businesses"
  ON businesses
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();
