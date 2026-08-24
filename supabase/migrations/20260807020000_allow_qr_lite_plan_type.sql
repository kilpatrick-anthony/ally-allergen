-- Unique version assigned during migration-history reconciliation.
-- Add the new "QR Lite" tier to the businesses.plan_type allow-list.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_plan_type_check'
  ) THEN
    ALTER TABLE businesses DROP CONSTRAINT businesses_plan_type_check;
  END IF;

  ALTER TABLE businesses
    ADD CONSTRAINT businesses_plan_type_check
    CHECK (plan_type IN ('trial', 'free', 'demo', 'qr_lite', 'starter', 'pro', 'enterprise'));
END $$;
