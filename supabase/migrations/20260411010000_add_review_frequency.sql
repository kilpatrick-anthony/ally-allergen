-- Unique version assigned during migration-history reconciliation.
-- Migration: Add preferred review frequency columns

-- Add preferred_review_months to ingredients table
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS preferred_review_months INTEGER DEFAULT 3;

-- Add preferred_review_months to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS preferred_review_months INTEGER DEFAULT 3;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ingredients_preferred_review_months ON ingredients(preferred_review_months);
CREATE INDEX IF NOT EXISTS idx_menu_items_preferred_review_months ON menu_items(preferred_review_months);
