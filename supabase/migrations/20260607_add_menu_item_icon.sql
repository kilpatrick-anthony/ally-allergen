-- Store menu item preset icons or uploaded image URLs for kiosk tiles.
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_icon
ON menu_items(icon)
WHERE icon IS NOT NULL;
