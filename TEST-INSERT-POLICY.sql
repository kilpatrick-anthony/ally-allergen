-- Test if the INSERT policy actually works for the authenticated user

-- First, verify the user_businesses record exists
SELECT user_id, business_id, role
FROM user_businesses
WHERE user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26';

-- Test the INSERT policy by simulating what the client sees
-- Set the session to act as the authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub TO '863f40a4-fa5a-4940-a819-a43d2422ab26';

-- Try to query user_businesses (this is what the policy does)
SELECT business_id 
FROM user_businesses 
WHERE user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26'
AND role IN ('owner', 'admin');

-- Now test if INSERT would be allowed (don't actually insert, just check)
-- Get the business_id first
DO $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id
  FROM user_businesses
  WHERE user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26'
  LIMIT 1;
  
  RAISE NOTICE 'Business ID: %', v_business_id;
  
  -- Test if this business_id would pass the INSERT policy check
  IF v_business_id IN (
    SELECT business_id 
    FROM user_businesses 
    WHERE user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26'
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE NOTICE 'INSERT policy check would PASS';
  ELSE
    RAISE NOTICE 'INSERT policy check would FAIL';
  END IF;
END $$;

-- Reset role
RESET ROLE;
