-- Unique version assigned during migration-history reconciliation.
-- Add eircode to sites
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS eircode TEXT;
