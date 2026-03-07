-- Create datasheets table for storing product specification sheets
CREATE TABLE IF NOT EXISTS datasheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  supplier_name TEXT,
  version TEXT,
  next_review_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT datasheets_status_check CHECK (status IN ('active', 'archived', 'expired'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS datasheets_business_id_idx ON datasheets(business_id);
CREATE INDEX IF NOT EXISTS datasheets_ingredient_id_idx ON datasheets(ingredient_id);
CREATE INDEX IF NOT EXISTS datasheets_status_idx ON datasheets(status);

-- Enable RLS
ALTER TABLE datasheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view datasheets for their business"
  ON datasheets FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert datasheets for their business"
  ON datasheets FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update datasheets for their business"
  ON datasheets FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete datasheets for their business"
  ON datasheets FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );
