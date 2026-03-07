-- Check if user has a business association
SELECT 
  ub.user_id,
  ub.business_id,
  ub.role,
  b.name as business_name,
  b.plan_type,
  au.email
FROM user_businesses ub
JOIN businesses b ON b.id = ub.business_id
JOIN auth.users au ON au.id = ub.user_id
ORDER BY ub.created_at DESC
LIMIT 5;

-- Also check businesses without user association
SELECT 
  b.id,
  b.name,
  b.plan_type,
  b.created_at
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM user_businesses ub WHERE ub.business_id = b.id
)
ORDER BY b.created_at DESC;
