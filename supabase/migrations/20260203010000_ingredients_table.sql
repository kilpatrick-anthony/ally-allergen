-- Unique version assigned during migration-history reconciliation.
-- Backup existing ingredients table
ALTER TABLE IF EXISTS ingredients RENAME TO ingredients_old_backup;

-- Create new ingredients table with updated structure
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  allergen_warnings JSONB NOT NULL DEFAULT '{}'::jsonb,
  suppliers TEXT[] DEFAULT ARRAY[]::TEXT[],
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'active',
  compliance TEXT DEFAULT 'compliant',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT ingredients_status_check CHECK (status IN ('active', 'review', 'archived')),
  CONSTRAINT ingredients_compliance_check CHECK (compliance IN ('compliant', 'warning', 'error'))
);

-- Migrate data from old table if it exists and has data
INSERT INTO ingredients (
  business_id,
  name,
  description,
  allergen_warnings,
  created_at,
  updated_at
)
SELECT 
  business_id,
  name,
  description,
  jsonb_build_object(
    'cereals_gluten', CASE WHEN contains_cereals_gluten THEN 'contains' ELSE 'none' END,
    'crustaceans', CASE WHEN contains_crustaceans THEN 'contains' ELSE 'none' END,
    'eggs', CASE WHEN contains_eggs THEN 'contains' ELSE 'none' END,
    'fish', CASE WHEN contains_fish THEN 'contains' ELSE 'none' END,
    'peanuts', CASE WHEN contains_peanuts THEN 'contains' ELSE 'none' END,
    'soybeans', CASE WHEN contains_soybeans THEN 'contains' ELSE 'none' END,
    'milk', CASE WHEN contains_milk THEN 'contains' ELSE 'none' END,
    'nuts', CASE WHEN contains_nuts THEN 'contains' ELSE 'none' END,
    'celery', CASE WHEN contains_celery THEN 'contains' ELSE 'none' END,
    'mustard', CASE WHEN contains_mustard THEN 'contains' ELSE 'none' END,
    'sesame', CASE WHEN contains_sesame THEN 'contains' ELSE 'none' END,
    'sulphites', CASE WHEN contains_sulphites THEN 'contains' ELSE 'none' END,
    'lupin', CASE WHEN contains_lupin THEN 'contains' ELSE 'none' END,
    'molluscs', CASE WHEN contains_molluscs THEN 'contains' ELSE 'none' END
  ),
  created_at,
  updated_at
FROM ingredients_old_backup
WHERE EXISTS (SELECT 1 FROM ingredients_old_backup LIMIT 1);

-- Add indexes
CREATE INDEX IF NOT EXISTS ingredients_business_id_idx ON ingredients(business_id);
CREATE INDEX IF NOT EXISTS ingredients_name_idx ON ingredients(name);
CREATE INDEX IF NOT EXISTS ingredients_status_idx ON ingredients(status);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ingredients for their business"
  ON ingredients FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ingredients for their business"
  ON ingredients FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients for their business"
  ON ingredients FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients for their business"
  ON ingredients FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses 
      WHERE user_id = auth.uid()
    )
  );
