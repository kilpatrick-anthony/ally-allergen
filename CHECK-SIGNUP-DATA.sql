-- Check if the business and user_businesses records were created during signup

-- Check businesses table
SELECT id, name, slug, status, plan_type, trial_ends_at, created_at
FROM businesses
ORDER BY created_at DESC
LIMIT 5;

-- Check user_businesses table for your user
SELECT ub.id, ub.user_id, ub.business_id, ub.role, ub.created_at,
       b.name as business_name
FROM user_businesses ub
LEFT JOIN businesses b ON b.id = ub.business_id
WHERE ub.user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26'
ORDER BY ub.created_at DESC;

-- Check if RLS is blocking the query (run as authenticated user)
-- This simulates what the client sees
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "863f40a4-fa5a-4940-a819-a43d2422ab26"}';

SELECT business_id, role
FROM user_businesses
WHERE user_id = '863f40a4-fa5a-4940-a819-a43d2422ab26';

-- Reset role
RESET ROLE;
