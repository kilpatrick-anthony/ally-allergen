-- Fix infinite recursion in user_businesses RLS policies

-- Drop the recursive policy that causes infinite loop
DROP POLICY IF EXISTS "Business owners can view their business associations" ON user_businesses;

-- Keep only the simple policy that doesn't recurse
-- (This one already exists and works correctly)
-- Users can view their own business associations using auth.uid() = user_id

-- Verify remaining policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_businesses'
ORDER BY policyname;
