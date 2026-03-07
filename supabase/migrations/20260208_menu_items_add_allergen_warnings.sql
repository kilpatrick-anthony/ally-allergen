-- Add allergen warnings to menu items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS allergen_warnings JSONB NOT NULL DEFAULT '{}'::jsonb;
