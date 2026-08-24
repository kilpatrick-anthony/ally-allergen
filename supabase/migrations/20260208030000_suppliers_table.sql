-- Unique version assigned during migration-history reconciliation.
-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  type TEXT DEFAULT 'general',
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  compliance_score INTEGER DEFAULT 0,
  ingredient_count INTEGER DEFAULT 0,
  response_time TEXT DEFAULT 'N/A',
  last_audit TEXT DEFAULT 'N/A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT suppliers_status_check CHECK (status IN ('active', 'inactive', 'pending')),
  CONSTRAINT suppliers_business_name_unique UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS suppliers_business_id_idx ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON suppliers(name);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers for their business"
  ON suppliers FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert suppliers for their business"
  ON suppliers FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update suppliers for their business"
  ON suppliers FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete suppliers for their business"
  ON suppliers FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );
