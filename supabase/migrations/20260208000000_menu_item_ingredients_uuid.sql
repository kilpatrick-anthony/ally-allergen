-- Version normalized from the legacy remote ID 20260208.
-- Recreate menu_item_ingredients with UUID columns
-- NOTE: This drops existing links because bigint values cannot be mapped to UUIDs.
DROP TABLE IF EXISTS menu_item_ingredients;

CREATE TABLE menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_item_ingredients_menu_item_id_idx
  ON menu_item_ingredients(menu_item_id);

CREATE INDEX IF NOT EXISTS menu_item_ingredients_ingredient_id_idx
  ON menu_item_ingredients(ingredient_id);

CREATE UNIQUE INDEX IF NOT EXISTS menu_item_ingredients_unique_pair_idx
  ON menu_item_ingredients(menu_item_id, ingredient_id);
