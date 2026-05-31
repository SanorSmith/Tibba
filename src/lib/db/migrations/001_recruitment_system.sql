-- ============================================================
-- TIBBNA HOSPITAL - ENTERPRISE RECRUITMENT SYSTEM
-- Complete Database Migration
-- Date: 2026-04-29
-- ============================================================
-- CRITICAL: Does NOT drop or recreate job_candidates or job_vacancies.
-- Only ALTERs existing tables and creates 21 new tables.
-- ============================================================

BEGIN;

-- ============================================
-- PART 1: ENHANCE EXISTING job_candidates TABLE
-- ============================================

ALTER TABLE job_candidates
  ADD COLUMN IF NOT EXISTS current_position VARCHAR(200),
  ADD COLUMN IF NOT EXISTS total_experience_years NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS highest_education VARCHAR(100),
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS current_salary NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS salary_negotiable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS current_address TEXT,
  ADD COLUMN IF NOT EXISTS current_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS current_country VARCHAR(100) DEFAULT 'Iraq',
  ADD COLUMN IF NOT EXISTS willing_to_relocate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS referral_employee_id UUID,
  ADD COLUMN IF NOT EXISTS referral_notes TEXT,
  ADD COLUMN IF NOT EXISTS overall_status VARCHAR(50) DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT,
  ADD COLUMN IF NOT EXISTS data_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_consent_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_job_candidates_workspace ON job_candidates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_overall_status ON job_candidates(overall_status);
CREATE INDEX IF NOT EXISTS idx_job_candidates_source ON job_candidates(source);
CREATE INDEX IF NOT EXISTS idx_job_candidates_email ON job_candidates(email);

-- ============================================
-- PART 2: ENHANCE EXISTING job_vacancies TABLE
-- ============================================

ALTER TABLE job_vacancies
  ADD COLUMN IF NOT EXISTS requisition_id UUID,
  ADD COLUMN IF NOT EXISTS reporting_to UUID,
  ADD COLUMN IF NOT EXISTS location VARCHAR(200) DEFAULT 'Baghdad',
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'FULL_TIME',
  ADD COLUMN IF NOT EXISTS hiring_manager_id UUID,
  ADD COLUMN IF NOT EXISTS recruiter_id UUID,
  ADD COLUMN IF NOT EXISTS job_description TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS required_qualifications TEXT,
  ADD COLUMN IF NOT EXISTS preferred_qualifications TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT,
  ADD COLUMN IF NOT EXISTS salary_display_option VARCHAR(50) DEFAULT 'RANGE',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IQD',
  ADD COLUMN IF NOT EXISTS salary_grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS publish_on_career_page BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS publish_externally BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS external_job_boards TEXT[],
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_job_vacancies_workspace ON job_vacancies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_department ON job_vacancies(department_id);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_status ON job_vacancies(status);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_requisition ON job_vacancies(requisition_id);

-- ============================================
-- PART 3: CREATE 21 NEW RECRUITMENT TABLES
-- ============================================

-- ──────────────────────────────────────────
-- 1. job_requisitions
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_requisitions (
  requisition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_number VARCHAR(50) NOT NULL UNIQUE,
  workspace_id UUID NOT NULL,
  position_title VARCHAR(200) NOT NULL,
  department_id UUID,
  reporting_to UUID,
  location VARCHAR(200) DEFAULT 'Baghdad',
  employment_type VARCHAR(50) DEFAULT 'FULL_TIME',
  number_of_positions INTEGER DEFAULT 1,
  replacement_for UUID,
  is_replacement BOOLEAN DEFAULT FALSE,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'IQD',
  annual_budget_impact NUMERIC(14,2),
  requested_by UUID,
  requested_date DATE DEFAULT CURRENT_DATE,
  required_by_date DATE,
  status VARCHAR(50) DEFAULT 'DRAFT',
  priority VARCHAR(20) DEFAULT 'NORMAL',
  business_justification TEXT,
  job_description TEXT,
  key_responsibilities TEXT,
  required_qualifications TEXT,
  preferred_qualifications TEXT,
  hr_approved_by UUID,
  hr_approved_at TIMESTAMP,
  finance_approved_by UUID,
  finance_approved_at TIMESTAMP,
  final_approved_by UUID,
  final_approved_at TIMESTAMP,
  rejected_by UUID,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisitions_workspace ON job_requisitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON job_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_department ON job_requisitions(department_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_requested_by ON job_requisitions(requested_by);

-- ──────────────────────────────────────────
-- 2. requisition_approval_history
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requisition_approval_history (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES job_requisitions(requisition_id) ON DELETE CASCADE,
  approver_role VARCHAR(50) NOT NULL,
  approver_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  comments TEXT,
  approved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_approval_requisition ON requisition_approval_history(requisition_id);

-- ──────────────────────────────────────────
-- 3. job_applications
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(50) NOT NULL UNIQUE,
  workspace_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES job_candidates(id) ON DELETE CASCADE,
  vacancy_id UUID NOT NULL REFERENCES job_vacancies(id) ON DELETE CASCADE,
  applied_date TIMESTAMP DEFAULT NOW(),
  current_stage_id UUID,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  source VARCHAR(100),
  cover_letter TEXT,
  match_score NUMERIC(5,2),
  is_internal BOOLEAN DEFAULT FALSE,
  withdrawn_at TIMESTAMP,
  withdrawal_reason TEXT,
  hired_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  rejection_stage VARCHAR(100),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_workspace ON job_applications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON job_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_vacancy ON job_applications(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_candidate_vacancy ON job_applications(candidate_id, vacancy_id);

-- ──────────────────────────────────────────
-- 4. recruitment_stages
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruitment_stages (
  stage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type VARCHAR(50) NOT NULL,
  stage_description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  target_days INTEGER DEFAULT 7,
  auto_advance BOOLEAN DEFAULT FALSE,
  requires_evaluation BOOLEAN DEFAULT FALSE,
  requires_assessment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stages_workspace ON recruitment_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stages_order ON recruitment_stages(stage_order);

-- ──────────────────────────────────────────
-- 5. application_stage_history
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_stage_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES recruitment_stages(stage_id),
  entered_at TIMESTAMP DEFAULT NOW(),
  exited_at TIMESTAMP,
  duration_hours NUMERIC(10,2),
  outcome VARCHAR(50),
  moved_by UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_application ON application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_stage ON application_stage_history(stage_id);

-- ──────────────────────────────────────────
-- 6. hiring_team_members
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hiring_team_members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES job_vacancies(id) ON DELETE CASCADE,
  employee_id UUID,
  user_id UUID,
  role VARCHAR(50) NOT NULL,
  can_view_applications BOOLEAN DEFAULT TRUE,
  can_evaluate BOOLEAN DEFAULT TRUE,
  can_make_decisions BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hiring_team_vacancy ON hiring_team_members(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_hiring_team_employee ON hiring_team_members(employee_id);

-- ──────────────────────────────────────────
-- 7. interviews
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  interview_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  stage_id UUID REFERENCES recruitment_stages(stage_id),
  interview_type VARCHAR(50) NOT NULL DEFAULT 'IN_PERSON',
  interview_round INTEGER DEFAULT 1,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Baghdad',
  location VARCHAR(200),
  meeting_link TEXT,
  status VARCHAR(50) DEFAULT 'SCHEDULED',
  cancelled_reason TEXT,
  rescheduled_from UUID,
  candidate_confirmed BOOLEAN DEFAULT FALSE,
  candidate_confirmed_at TIMESTAMP,
  overall_rating NUMERIC(3,1),
  overall_recommendation VARCHAR(50),
  summary TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_workspace ON interviews(workspace_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- ──────────────────────────────────────────
-- 8. interview_panel
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_panel (
  panel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(interview_id) ON DELETE CASCADE,
  interviewer_id UUID,
  interviewer_name VARCHAR(200),
  interviewer_role VARCHAR(100),
  is_lead BOOLEAN DEFAULT FALSE,
  has_submitted_evaluation BOOLEAN DEFAULT FALSE,
  attendance_status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panel_interview ON interview_panel(interview_id);
CREATE INDEX IF NOT EXISTS idx_panel_interviewer ON interview_panel(interviewer_id);

-- ──────────────────────────────────────────
-- 9. interview_evaluations
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_evaluations (
  evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(interview_id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  overall_rating NUMERIC(3,1) NOT NULL,
  recommendation VARCHAR(50) NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  detailed_feedback TEXT,
  criteria_scores JSONB DEFAULT '{}',
  is_confidential BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_interview ON interview_evaluations(interview_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON interview_evaluations(evaluator_id);

-- ──────────────────────────────────────────
-- 10. evaluation_criteria
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluation_criteria (
  criteria_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  criteria_name VARCHAR(200) NOT NULL,
  criteria_category VARCHAR(100),
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score NUMERIC(3,1) DEFAULT 5.0,
  is_required BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  applies_to VARCHAR(50) DEFAULT 'ALL',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criteria_workspace ON evaluation_criteria(workspace_id);

-- ──────────────────────────────────────────
-- 11. assessment_tests
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_tests (
  test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  test_name VARCHAR(200) NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  passing_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  instructions TEXT,
  test_content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_workspace ON assessment_tests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tests_type ON assessment_tests(test_type);

-- ──────────────────────────────────────────
-- 12. candidate_assessments
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES assessment_tests(test_id),
  assigned_date TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  status VARCHAR(50) DEFAULT 'ASSIGNED',
  answers JSONB DEFAULT '{}',
  evaluated_by UUID,
  evaluator_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_application ON candidate_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_assessments_test ON candidate_assessments(test_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON candidate_assessments(status);

-- ──────────────────────────────────────────
-- 13. reference_checks
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reference_checks (
  reference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  referee_name VARCHAR(200) NOT NULL,
  referee_title VARCHAR(200),
  referee_company VARCHAR(200),
  referee_email VARCHAR(200),
  referee_phone VARCHAR(50),
  relationship VARCHAR(100),
  years_known INTEGER,
  contacted_date TIMESTAMP,
  completed_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'PENDING',
  overall_rating NUMERIC(3,1),
  recommendation VARCHAR(50),
  would_rehire BOOLEAN,
  strengths TEXT,
  concerns TEXT,
  additional_comments TEXT,
  verified_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_application ON reference_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_reference_status ON reference_checks(status);

-- ──────────────────────────────────────────
-- 14. background_checks
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS background_checks (
  check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  check_type VARCHAR(100) NOT NULL,
  provider VARCHAR(200),
  requested_date TIMESTAMP DEFAULT NOW(),
  completed_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'PENDING',
  result VARCHAR(50),
  details JSONB DEFAULT '{}',
  report_url TEXT,
  expiry_date DATE,
  verified_by UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_application ON background_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_background_status ON background_checks(status);

-- ──────────────────────────────────────────
-- 15. job_offers
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_offers (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_number VARCHAR(50) NOT NULL UNIQUE,
  workspace_id UUID NOT NULL,
  application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES job_candidates(id),
  vacancy_id UUID NOT NULL REFERENCES job_vacancies(id),
  position_title VARCHAR(200) NOT NULL,
  department VARCHAR(200),
  offered_salary NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'IQD',
  salary_period VARCHAR(20) DEFAULT 'MONTHLY',
  probation_months INTEGER DEFAULT 3,
  start_date DATE,
  contract_type VARCHAR(50) DEFAULT 'FULL_TIME',
  contract_duration_months INTEGER,
  benefits_package TEXT,
  signing_bonus NUMERIC(12,2),
  relocation_package BOOLEAN DEFAULT FALSE,
  relocation_amount NUMERIC(12,2),
  other_terms TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT',
  sent_at TIMESTAMP,
  expires_at TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  revoked_at TIMESTAMP,
  revoke_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_workspace ON job_offers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_offers_application ON job_offers(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON job_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON job_offers(status);

-- ──────────────────────────────────────────
-- 16. offer_negotiation_history
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_negotiation_history (
  negotiation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES job_offers(offer_id) ON DELETE CASCADE,
  round_number INTEGER DEFAULT 1,
  initiated_by VARCHAR(50) NOT NULL,
  proposed_salary NUMERIC(12,2),
  proposed_start_date DATE,
  proposed_benefits TEXT,
  other_requests TEXT,
  response VARCHAR(50),
  response_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_offer ON offer_negotiation_history(offer_id);

-- ──────────────────────────────────────────
-- 17. candidate_documents
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES job_candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES job_applications(application_id),
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(300) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID,
  verified_at TIMESTAMP,
  expiry_date DATE,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_application ON candidate_documents(application_id);

-- ──────────────────────────────────────────
-- 18. candidate_notes
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES job_candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES job_applications(application_id),
  author_id UUID NOT NULL,
  author_name VARCHAR(200),
  note_type VARCHAR(50) DEFAULT 'GENERAL',
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_candidate ON candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_application ON candidate_notes(application_id);

-- ──────────────────────────────────────────
-- 19. candidate_communications
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_communications (
  communication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES job_candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES job_applications(application_id),
  comm_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  subject VARCHAR(300),
  body TEXT,
  template_id UUID,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'DRAFT',
  sent_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comms_candidate ON candidate_communications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_comms_application ON candidate_communications(application_id);
CREATE INDEX IF NOT EXISTS idx_comms_status ON candidate_communications(status);

-- ──────────────────────────────────────────
-- 20. recruitment_metrics
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruitment_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  vacancy_id UUID,
  department_id UUID,
  total_applications INTEGER DEFAULT 0,
  new_applications INTEGER DEFAULT 0,
  screened INTEGER DEFAULT 0,
  interviewed INTEGER DEFAULT 0,
  offered INTEGER DEFAULT 0,
  hired INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  withdrawn INTEGER DEFAULT 0,
  avg_time_to_hire_days NUMERIC(10,2),
  avg_time_to_fill_days NUMERIC(10,2),
  avg_cost_per_hire NUMERIC(12,2),
  offer_acceptance_rate NUMERIC(5,2),
  quality_of_hire_score NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_workspace ON recruitment_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON recruitment_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON recruitment_metrics(metric_type);

-- ──────────────────────────────────────────
-- 21. recruitment_source_metrics
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruitment_source_metrics (
  source_metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  source VARCHAR(100) NOT NULL,
  total_candidates INTEGER DEFAULT 0,
  qualified_candidates INTEGER DEFAULT 0,
  interviewed INTEGER DEFAULT 0,
  offered INTEGER DEFAULT 0,
  hired INTEGER DEFAULT 0,
  avg_quality_score NUMERIC(5,2),
  cost NUMERIC(12,2),
  cost_per_hire NUMERIC(12,2),
  conversion_rate NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_metrics_workspace ON recruitment_source_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_source_metrics_date ON recruitment_source_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_source_metrics_source ON recruitment_source_metrics(source);

COMMIT;
