-- Unique version assigned during migration-history reconciliation.
-- Migration: Add compliance tracking fields and settings

-- Add last_reviewed_at to ingredients table
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Add last_reviewed_at to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Add compliance_review_days setting to businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS compliance_review_days INTEGER DEFAULT 90;

-- Create compliance_audit table to track status changes
CREATE TABLE IF NOT EXISTS compliance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'menu_item')),
  old_compliance TEXT,
  new_compliance TEXT,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for compliance_audit table
CREATE INDEX IF NOT EXISTS idx_compliance_audit_business ON compliance_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_item ON compliance_audit(item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_changed_at ON compliance_audit(changed_at DESC);

-- Enable RLS on compliance_audit
ALTER TABLE compliance_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_audit (users can only see their business's audits)
CREATE POLICY "Users can view compliance audits for their business" ON compliance_audit
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert compliance audits" ON compliance_audit
  FOR INSERT WITH CHECK (true);
