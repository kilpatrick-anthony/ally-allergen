-- Create supplier notes table
CREATE TABLE IF NOT EXISTS supplier_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_notes_supplier_id_idx ON supplier_notes(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_notes_business_id_idx ON supplier_notes(business_id);

ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier notes for their business"
  ON supplier_notes FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert supplier notes for their business"
  ON supplier_notes FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update supplier notes for their business"
  ON supplier_notes FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete supplier notes for their business"
  ON supplier_notes FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );
