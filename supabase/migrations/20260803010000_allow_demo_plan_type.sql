-- Unique version assigned during migration-history reconciliation.
-- Allow demo plan type for internal showcase accounts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_plan_type_check'
      AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses DROP CONSTRAINT businesses_plan_type_check;
  END IF;

  ALTER TABLE businesses
    ADD CONSTRAINT businesses_plan_type_check
    CHECK (plan_type IN ('trial', 'free', 'demo', 'starter', 'pro', 'enterprise'));
END $$;
