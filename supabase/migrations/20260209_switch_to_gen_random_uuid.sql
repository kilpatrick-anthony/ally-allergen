-- 20260209_switch_to_gen_random_uuid.sql
-- This migration ensures all UUID columns use gen_random_uuid() and pgcrypto extension.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- No schema changes, but this migration marks the transition to gen_random_uuid().
-- All previous migrations have been updated in-place, so this is a no-op for schema.
-- If you need to reapply the schema, use the latest structure from the codebase.
