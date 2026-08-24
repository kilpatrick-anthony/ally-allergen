-- Unique version assigned during migration-history reconciliation.
-- Training Hub MVP: optional starter template data
-- Safe to run multiple times because inserts are idempotent on title+is_global.

WITH food_hygiene_course AS (
  INSERT INTO training_courses (
    business_id,
    title,
    description,
    status,
    is_global,
    version
  )
  SELECT
    NULL,
    'Food Safety Essentials (Level 1)',
    'Core introduction to contamination risks, hygiene controls, and allergen awareness.',
    'active',
    true,
    1
  WHERE NOT EXISTS (
    SELECT 1 FROM training_courses
    WHERE title = 'Food Safety Essentials (Level 1)' AND is_global = true
  )
  RETURNING id
),
food_hygiene_course_id AS (
  SELECT id FROM food_hygiene_course
  UNION ALL
  SELECT id FROM training_courses
  WHERE title = 'Food Safety Essentials (Level 1)' AND is_global = true
  LIMIT 1
)
INSERT INTO training_modules (
  course_id,
  title,
  module_type,
  content_json,
  order_index,
  estimated_minutes,
  pass_mark
)
SELECT
  c.id,
  m.title,
  m.module_type::training_module_type,
  m.content_json::jsonb,
  m.order_index,
  m.estimated_minutes,
  m.pass_mark
FROM food_hygiene_course_id c
CROSS JOIN (
  VALUES
    (
      'Introduction to Food Safety',
      'lesson',
      '{"body":"Food safety protects customers and your business reputation."}',
      1,
      8,
      NULL
    ),
    (
      'Cross-Contamination Prevention',
      'video',
      '{"videoUrl":"https://example.com/training/cross-contamination","summary":"How to separate raw/ready-to-eat handling."}',
      2,
      10,
      NULL
    ),
    (
      'Food Safety Quiz',
      'quiz',
      '{"questions":[{"id":"q1","text":"Best temperature danger zone practice?"}]}'::text,
      3,
      7,
      80
    )
) AS m(title, module_type, content_json, order_index, estimated_minutes, pass_mark)
WHERE NOT EXISTS (
  SELECT 1
  FROM training_modules tm
  WHERE tm.course_id = c.id AND tm.title = m.title
);

WITH allergy_course AS (
  INSERT INTO training_courses (
    business_id,
    title,
    description,
    status,
    is_global,
    version
  )
  SELECT
    NULL,
    'Allergen Control & Communication',
    'Practical allergen handling, storage controls, and customer communication procedures.',
    'active',
    true,
    1
  WHERE NOT EXISTS (
    SELECT 1 FROM training_courses
    WHERE title = 'Allergen Control & Communication' AND is_global = true
  )
  RETURNING id
),
allergy_course_id AS (
  SELECT id FROM allergy_course
  UNION ALL
  SELECT id FROM training_courses
  WHERE title = 'Allergen Control & Communication' AND is_global = true
  LIMIT 1
)
INSERT INTO training_modules (
  course_id,
  title,
  module_type,
  content_json,
  order_index,
  estimated_minutes,
  pass_mark
)
SELECT
  c.id,
  m.title,
  m.module_type::training_module_type,
  m.content_json::jsonb,
  m.order_index,
  m.estimated_minutes,
  m.pass_mark
FROM allergy_course_id c
CROSS JOIN (
  VALUES
    (
      'The 14 Allergens Overview',
      'lesson',
      '{"body":"Understand major allergens and where they commonly appear in recipes."}',
      1,
      12,
      NULL
    ),
    (
      'Allergen SOP in Service',
      'lesson',
      '{"body":"How to respond to allergen questions confidently and safely."}',
      2,
      10,
      NULL
    ),
    (
      'Allergen Knowledge Check',
      'quiz',
      '{"questions":[{"id":"q1","text":"What is the first step when a customer reports an allergen concern?"}]}'::text,
      3,
      6,
      80
    )
) AS m(title, module_type, content_json, order_index, estimated_minutes, pass_mark)
WHERE NOT EXISTS (
  SELECT 1
  FROM training_modules tm
  WHERE tm.course_id = c.id AND tm.title = m.title
);
