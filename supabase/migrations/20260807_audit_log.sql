-- Audit trail for ingredient and menu item edits.
-- Records who changed what and when, so admins can review a full history
-- of edits rather than just "created" / "last updated" timestamps.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ingredient', 'menu_item')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_business_idx ON audit_log(business_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log for their business"
  ON audit_log FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit log for their business"
  ON audit_log FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid()
    )
  );
