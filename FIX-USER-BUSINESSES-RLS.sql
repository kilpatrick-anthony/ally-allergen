-- Fix RLS policies for user_businesses table to allow users to read their own records

-- First, let's see current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_businesses';

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view their own business associations" ON user_businesses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_businesses;

-- Create a policy that allows users to SELECT their own user_businesses records
CREATE POLICY "Users can view their own business associations"
ON user_businesses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure businesses table allows viewing businesses that user is associated with
DROP POLICY IF EXISTS "Users can view their associated businesses" ON businesses;

CREATE POLICY "Users can view their associated businesses"
ON businesses
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_businesses', 'businesses')
ORDER BY tablename, policyname;
