-- Unique version assigned during migration-history reconciliation.
-- Add opening_hours column to sites table
-- Structure: { "monday": { "open": "09:00", "close": "22:00", "closed": false }, ... }
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

COMMENT ON COLUMN sites.opening_hours IS
  'Weekly opening hours as JSON. Keys are lowercase day names (monday–sunday). '
  'Each value: { open: "HH:MM", close: "HH:MM", closed: boolean }. '
  'NULL means no hours configured – kiosk runs without sleep mode.';
