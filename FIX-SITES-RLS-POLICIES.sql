-- Check and fix RLS policies for sites table

-- Check current policies on sites table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'sites'
ORDER BY cmd, policyname;

-- Allow business owners to insert sites for their business
DROP POLICY IF EXISTS "Business owners can create sites" ON sites;

CREATE POLICY "Business owners can create sites"
ON sites
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Allow users to view sites for their business
DROP POLICY IF EXISTS "Users can view their business sites" ON sites;

CREATE POLICY "Users can view their business sites"
ON sites
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = auth.uid()
  )
);

-- Allow business owners to update sites
DROP POLICY IF EXISTS "Business owners can update sites" ON sites;

CREATE POLICY "Business owners can update sites"
ON sites
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Allow business owners to delete sites
DROP POLICY IF EXISTS "Business owners can delete sites" ON sites;

CREATE POLICY "Business owners can delete sites"
ON sites
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'sites'
ORDER BY cmd, policyname;
