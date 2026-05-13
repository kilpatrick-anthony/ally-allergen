-- Add dietary column to menu_items table
-- Run this in your Supabase SQL editor to enable dietary attribute storage on menu items

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary TEXT[] DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'menu_items' AND column_name = 'dietary';
