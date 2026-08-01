-- Training Hub MVP: core schema

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_module_type') THEN
    CREATE TYPE training_module_type AS ENUM ('lesson', 'video', 'quiz');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_enrollment_status') THEN
    CREATE TYPE training_enrollment_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_certificate_type') THEN
    CREATE TYPE training_certificate_type AS ENUM ('awareness', 'external');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_global BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_courses_status_check CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT training_courses_version_check CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module_type training_module_type NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  pass_mark INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_modules_estimated_minutes_check CHECK (estimated_minutes > 0),
  CONSTRAINT training_modules_pass_mark_check CHECK (pass_mark IS NULL OR (pass_mark >= 0 AND pass_mark <= 100))
);

CREATE TABLE IF NOT EXISTS training_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  due_in_days INTEGER,
  refresh_every_days INTEGER,
  mandatory BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_requirements_target_type_check CHECK (target_type IN ('role', 'site', 'user')),
  CONSTRAINT training_requirements_due_days_check CHECK (due_in_days IS NULL OR due_in_days >= 0),
  CONSTRAINT training_requirements_refresh_days_check CHECK (refresh_every_days IS NULL OR refresh_every_days >= 0)
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  status training_enrollment_status NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id, course_id)
);

CREATE TABLE IF NOT EXISTS training_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_module_progress_percent_check CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT training_module_progress_attempts_check CHECK (attempts_count >= 0),
  CONSTRAINT training_module_progress_best_score_check CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 100)),
  UNIQUE (enrollment_id, module_id)
);

CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_quiz_attempts_score_check CHECK (score >= 0 AND score <= 100)
);

CREATE TABLE IF NOT EXISTS training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_type training_certificate_type NOT NULL DEFAULT 'awareness',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_external_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  file_url TEXT NOT NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_notifications_type_check CHECK (type IN ('assigned', 'reminder_30', 'reminder_14', 'reminder_7', 'overdue', 'completed')),
  CONSTRAINT training_notifications_channel_check CHECK (channel IN ('email', 'in_app'))
);
