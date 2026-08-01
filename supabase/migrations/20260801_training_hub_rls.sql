-- Training Hub MVP: RLS policies

ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_external_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_notifications ENABLE ROW LEVEL SECURITY;

-- Helper predicates used in policies (via repeated subqueries).
-- Manager/owner permission in a business.
-- NOTE: super_admin bypass is included for support operations.

-- training_courses ------------------------------------------------------------
DROP POLICY IF EXISTS "training_courses_select" ON training_courses;
CREATE POLICY "training_courses_select"
  ON training_courses FOR SELECT
  USING (
    (is_global = true)
    OR (
      business_id IN (
        SELECT business_id
        FROM user_businesses
        WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_courses_write" ON training_courses;
CREATE POLICY "training_courses_write"
  ON training_courses FOR ALL
  USING (
    (
      business_id IN (
        SELECT business_id FROM user_businesses
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    (
      business_id IN (
        SELECT business_id FROM user_businesses
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- training_modules ------------------------------------------------------------
DROP POLICY IF EXISTS "training_modules_select" ON training_modules;
CREATE POLICY "training_modules_select"
  ON training_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM training_courses c
      WHERE c.id = training_modules.course_id
      AND (
        c.is_global = true
        OR c.business_id IN (
          SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

DROP POLICY IF EXISTS "training_modules_write" ON training_modules;
CREATE POLICY "training_modules_write"
  ON training_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM training_courses c
      WHERE c.id = training_modules.course_id
      AND (
        c.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM training_courses c
      WHERE c.id = training_modules.course_id
      AND (
        c.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

-- training_requirements -------------------------------------------------------
DROP POLICY IF EXISTS "training_requirements_select" ON training_requirements;
CREATE POLICY "training_requirements_select"
  ON training_requirements FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_requirements_write" ON training_requirements;
CREATE POLICY "training_requirements_write"
  ON training_requirements FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- training_enrollments --------------------------------------------------------
DROP POLICY IF EXISTS "training_enrollments_select" ON training_enrollments;
CREATE POLICY "training_enrollments_select"
  ON training_enrollments FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_enrollments_write" ON training_enrollments;
CREATE POLICY "training_enrollments_write"
  ON training_enrollments FOR ALL
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- training_module_progress ----------------------------------------------------
DROP POLICY IF EXISTS "training_module_progress_select" ON training_module_progress;
CREATE POLICY "training_module_progress_select"
  ON training_module_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM training_enrollments e
      WHERE e.id = training_module_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR e.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

DROP POLICY IF EXISTS "training_module_progress_write" ON training_module_progress;
CREATE POLICY "training_module_progress_write"
  ON training_module_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM training_enrollments e
      WHERE e.id = training_module_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR e.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM training_enrollments e
      WHERE e.id = training_module_progress.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR e.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

-- training_quiz_attempts ------------------------------------------------------
DROP POLICY IF EXISTS "training_quiz_attempts_select" ON training_quiz_attempts;
CREATE POLICY "training_quiz_attempts_select"
  ON training_quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM training_enrollments e
      WHERE e.id = training_quiz_attempts.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR e.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

DROP POLICY IF EXISTS "training_quiz_attempts_insert" ON training_quiz_attempts;
CREATE POLICY "training_quiz_attempts_insert"
  ON training_quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM training_enrollments e
      WHERE e.id = training_quiz_attempts.enrollment_id
      AND (
        e.user_id = auth.uid()
        OR e.business_id IN (
          SELECT business_id FROM user_businesses
          WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
        )
        OR EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
      )
    )
  );

-- training_certificates -------------------------------------------------------
DROP POLICY IF EXISTS "training_certificates_select" ON training_certificates;
CREATE POLICY "training_certificates_select"
  ON training_certificates FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_certificates_write" ON training_certificates;
CREATE POLICY "training_certificates_write"
  ON training_certificates FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- training_external_evidence --------------------------------------------------
DROP POLICY IF EXISTS "training_external_evidence_select" ON training_external_evidence;
CREATE POLICY "training_external_evidence_select"
  ON training_external_evidence FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_external_evidence_write" ON training_external_evidence;
CREATE POLICY "training_external_evidence_write"
  ON training_external_evidence FOR ALL
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- training_notifications ------------------------------------------------------
DROP POLICY IF EXISTS "training_notifications_select" ON training_notifications;
CREATE POLICY "training_notifications_select"
  ON training_notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "training_notifications_write" ON training_notifications;
CREATE POLICY "training_notifications_write"
  ON training_notifications FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_businesses
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );
