-- Remove unused supplier fields
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS compliance_score,
  DROP COLUMN IF EXISTS response_time,
  DROP COLUMN IF EXISTS last_audit;

ALTER TABLE suppliers
  DROP CONSTRAINT IF EXISTS suppliers_status_check;
