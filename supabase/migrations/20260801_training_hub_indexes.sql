-- Training Hub MVP: indexes and utility trigger

CREATE INDEX IF NOT EXISTS idx_training_courses_business_status
  ON training_courses (business_id, status);

CREATE INDEX IF NOT EXISTS idx_training_courses_global
  ON training_courses (is_global, status)
  WHERE is_global = true;

CREATE INDEX IF NOT EXISTS idx_training_modules_course_order
  ON training_modules (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_training_requirements_business_active
  ON training_requirements (business_id, active);

CREATE INDEX IF NOT EXISTS idx_training_requirements_target
  ON training_requirements (business_id, target_type, target_value);

CREATE INDEX IF NOT EXISTS idx_training_enrollments_business_user
  ON training_enrollments (business_id, user_id);

CREATE INDEX IF NOT EXISTS idx_training_enrollments_status_due
  ON training_enrollments (status, due_at);

CREATE INDEX IF NOT EXISTS idx_training_enrollments_expires_at
  ON training_enrollments (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_progress_enrollment
  ON training_module_progress (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_training_progress_module
  ON training_module_progress (module_id);

CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_enrollment
  ON training_quiz_attempts (enrollment_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_certificates_business_user
  ON training_certificates (business_id, user_id);

CREATE INDEX IF NOT EXISTS idx_training_external_evidence_business_user
  ON training_external_evidence (business_id, user_id);

CREATE INDEX IF NOT EXISTS idx_training_notifications_schedule
  ON training_notifications (scheduled_for, sent_at);

-- Keep updated_at columns in sync.
CREATE OR REPLACE FUNCTION set_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_training_courses_updated_at ON training_courses;
CREATE TRIGGER trg_training_courses_updated_at
BEFORE UPDATE ON training_courses
FOR EACH ROW
EXECUTE FUNCTION set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_modules_updated_at ON training_modules;
CREATE TRIGGER trg_training_modules_updated_at
BEFORE UPDATE ON training_modules
FOR EACH ROW
EXECUTE FUNCTION set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_enrollments_updated_at ON training_enrollments;
CREATE TRIGGER trg_training_enrollments_updated_at
BEFORE UPDATE ON training_enrollments
FOR EACH ROW
EXECUTE FUNCTION set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_module_progress_updated_at ON training_module_progress;
CREATE TRIGGER trg_training_module_progress_updated_at
BEFORE UPDATE ON training_module_progress
FOR EACH ROW
EXECUTE FUNCTION set_training_updated_at();
