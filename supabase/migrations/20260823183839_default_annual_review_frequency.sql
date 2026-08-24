-- Unique version aligned with the original commit timestamp.
-- Use the FSAI's example annual HACCP review cadence as the default.
-- Existing item-specific preferences remain unchanged.
ALTER TABLE ingredients
ALTER COLUMN preferred_review_months SET DEFAULT 12;

ALTER TABLE menu_items
ALTER COLUMN preferred_review_months SET DEFAULT 12;
