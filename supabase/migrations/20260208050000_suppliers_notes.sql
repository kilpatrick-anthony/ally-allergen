-- Unique version assigned during migration-history reconciliation.
-- Add notes field to suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS notes TEXT;
