-- Check the actual columns in the businesses table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'businesses'
AND table_schema = 'public'
ORDER BY ordinal_position;
