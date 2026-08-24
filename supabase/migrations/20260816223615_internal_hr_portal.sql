-- Recorded remotely as migration 20260816223615.
-- Private AllyJen internal people portal.
-- These tables are deliberately server-only: browser roles have no grants and
-- RLS has no client policies. All access is mediated by MFA-protected API routes.

create table if not exists public.internal_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'employee'
    check (role in ('founder', 'director', 'people_admin', 'manager', 'employee')),
  internal_access boolean not null default true,
  can_manage_people boolean not null default false,
  can_manage_access boolean not null default false,
  can_grant_super_admin boolean not null default false,
  platform_super_admin boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_access_at timestamptz
);

create unique index if not exists internal_members_email_lower_idx
  on public.internal_members (lower(email));

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  work_email text,
  personal_email text,
  phone text,
  job_title text,
  department text,
  manager_employee_id uuid references public.hr_employees(id) on delete set null,
  employment_status text not null default 'active'
    check (employment_status in ('probation', 'active', 'leave', 'left')),
  employment_type text not null default 'permanent'
    check (employment_type in ('permanent', 'fixed_term', 'contractor', 'intern')),
  start_date date,
  end_date date,
  probation_end_date date,
  residence_permit_type text,
  residence_permit_expiry date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_employees_status_idx on public.hr_employees (employment_status);
create index if not exists hr_employees_probation_end_idx on public.hr_employees (probation_end_date);
create index if not exists hr_employees_permit_expiry_idx on public.hr_employees (residence_permit_expiry);

create table if not exists public.hr_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  category text not null
    check (category in ('contract', 'residence_permit', 'identity', 'right_to_work', 'probation', 'review', 'other')),
  title text not null,
  drive_file_id text,
  drive_url text not null,
  issued_on date,
  expires_on date,
  status text not null default 'current'
    check (status in ('current', 'expired', 'superseded')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (drive_url ~ '^https://(drive|docs)\.google\.com/')
);

create index if not exists hr_documents_employee_idx on public.hr_documents (employee_id);
create index if not exists hr_documents_expiry_idx on public.hr_documents (expires_on);

create table if not exists public.hr_probation_updates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  review_date date not null,
  stage text not null default 'custom'
    check (stage in ('30_day', '60_day', '90_day', 'final', 'custom')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'passed', 'extended', 'not_passed')),
  score smallint check (score between 1 and 5),
  summary text,
  actions text,
  next_review_date date,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_probation_employee_idx on public.hr_probation_updates (employee_id);
create index if not exists hr_probation_next_review_idx on public.hr_probation_updates (next_review_date);

create table if not exists public.hr_objectives (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  title text not null,
  description text,
  success_measure text,
  owner_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_objectives_employee_idx on public.hr_objectives (employee_id);
create index if not exists hr_objectives_due_idx on public.hr_objectives (due_date);

create table if not exists public.hr_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  title text not null,
  review_date date not null,
  period_start date,
  period_end date,
  status text not null default 'draft'
    check (status in ('draft', 'shared', 'acknowledged', 'complete')),
  overall_score numeric(2,1) check (overall_score between 1 and 5),
  strengths text,
  development_areas text,
  manager_comments text,
  employee_comments text,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_reviews_employee_idx on public.hr_reviews (employee_id);
create index if not exists hr_reviews_date_idx on public.hr_reviews (review_date);

create table if not exists public.internal_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists internal_audit_created_idx on public.internal_audit_log (created_at desc);
create index if not exists internal_audit_entity_idx on public.internal_audit_log (entity_type, entity_id);

alter table public.internal_members enable row level security;
alter table public.hr_employees enable row level security;
alter table public.hr_documents enable row level security;
alter table public.hr_probation_updates enable row level security;
alter table public.hr_objectives enable row level security;
alter table public.hr_reviews enable row level security;
alter table public.internal_audit_log enable row level security;

revoke all on table public.internal_members from anon, authenticated;
revoke all on table public.hr_employees from anon, authenticated;
revoke all on table public.hr_documents from anon, authenticated;
revoke all on table public.hr_probation_updates from anon, authenticated;
revoke all on table public.hr_objectives from anon, authenticated;
revoke all on table public.hr_reviews from anon, authenticated;
revoke all on table public.internal_audit_log from anon, authenticated;
revoke all on sequence public.internal_audit_log_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.internal_members to service_role;
grant select, insert, update, delete on table public.hr_employees to service_role;
grant select, insert, update, delete on table public.hr_documents to service_role;
grant select, insert, update, delete on table public.hr_probation_updates to service_role;
grant select, insert, update, delete on table public.hr_objectives to service_role;
grant select, insert, update, delete on table public.hr_reviews to service_role;
grant select, insert on table public.internal_audit_log to service_role;
grant usage, select on sequence public.internal_audit_log_id_seq to service_role;
