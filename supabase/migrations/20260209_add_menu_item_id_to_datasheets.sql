-- Migration: Add menu_item_id to datasheets table
ALTER TABLE datasheets ADD COLUMN menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE;