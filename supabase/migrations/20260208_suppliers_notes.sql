-- Add notes field to suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS notes TEXT;
