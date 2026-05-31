# Tibbna Hospital - Enterprise Recruitment System
## Database Schema Documentation

---

## Overview

The Enterprise Recruitment System consists of **23 database tables** (2 enhanced + 21 new) that support the complete recruitment lifecycle from job requisition to hire.

**Database**: PostgreSQL (Neon)  
**Total Tables**: 23  
**Architecture**: Workspace-scoped multi-tenant  

---

## System Models

### 1. Requisition & Approval Model
> Handles position requests and multi-level approval workflow

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `job_requisitions` | Position request management | → departments, employees, users |
| `requisition_approval_history` | Audit trail for approvals | → job_requisitions, users |

**Approval Workflow**: `DRAFT` → `PENDING_HR` → `PENDING_FINANCE` → `PENDING_CEO` → `APPROVED`

### 2. Vacancy & Application Model
> Manages job postings and candidate applications

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `job_vacancies` (enhanced) | Job postings | → job_requisitions, departments, employees |
| `job_applications` | Candidate applications per vacancy | → job_candidates, job_vacancies |
| `hiring_team_members` | Team assigned to evaluate a vacancy | → job_vacancies, employees |

### 3. Candidate Management Model
> Comprehensive candidate profile and tracking

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `job_candidates` (enhanced) | Master candidate records | → employees (referral), workspaces |
| `candidate_documents` | Resumes, certificates, etc. | → job_candidates, job_applications |
| `candidate_notes` | Internal notes on candidates | → job_candidates, job_applications |
| `candidate_communications` | Email/SMS/call logs | → job_candidates, job_applications |

### 4. Pipeline & Stage Model
> Configurable recruitment pipeline stages

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `recruitment_stages` | Configurable pipeline stages | → workspaces |
| `application_stage_history` | Movement through pipeline | → job_applications, recruitment_stages |

**Default Stages**: Applied → Screening → Phone Screen → Assessment → Technical Interview → HR Interview → Manager Interview → Final Round → Offer → Hired

### 5. Interview & Evaluation Model
> Interview scheduling, panel management, and evaluations

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `interviews` | Interview scheduling | → job_applications, recruitment_stages |
| `interview_panel` | Interviewer assignments | → interviews, employees |
| `interview_evaluations` | Interviewer feedback | → interviews, users |
| `evaluation_criteria` | Scoring criteria templates | → workspaces |

### 6. Assessment Model
> Skills testing and candidate assessments

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `assessment_tests` | Test templates | → workspaces |
| `candidate_assessments` | Test assignments and results | → job_applications, assessment_tests |

### 7. Verification Model
> Reference and background checks

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `reference_checks` | Professional references | → job_applications |
| `background_checks` | Background verification | → job_applications |

### 8. Offer Management Model
> Job offer creation, negotiation, and acceptance

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `job_offers` | Offer details and status | → job_applications, job_candidates, job_vacancies |
| `offer_negotiation_history` | Negotiation rounds | → job_offers |

### 9. Analytics Model
> Recruitment metrics and source tracking

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `recruitment_metrics` | KPIs per period | → workspaces, job_vacancies |
| `recruitment_source_metrics` | Source effectiveness | → workspaces |

---

## Table Details

### job_requisitions (37 columns)
```
requisition_id          UUID PK
requisition_number      VARCHAR(50) UNIQUE
workspace_id            UUID NOT NULL
position_title          VARCHAR(200) NOT NULL
department_id           UUID → departments
reporting_to            UUID → employees
location                VARCHAR(200) DEFAULT 'Baghdad'
employment_type         VARCHAR(50) DEFAULT 'FULL_TIME'
number_of_positions     INTEGER DEFAULT 1
replacement_for         UUID
is_replacement          BOOLEAN DEFAULT FALSE
salary_min              NUMERIC(12,2)
salary_max              NUMERIC(12,2)
currency                VARCHAR(10) DEFAULT 'IQD'
annual_budget_impact    NUMERIC(14,2)
requested_by            UUID → employees
requested_date          DATE
required_by_date        DATE
status                  VARCHAR(50) DEFAULT 'DRAFT'
priority                VARCHAR(20) DEFAULT 'NORMAL'
business_justification  TEXT
job_description         TEXT
key_responsibilities    TEXT
required_qualifications TEXT
preferred_qualifications TEXT
hr_approved_by          UUID → users
hr_approved_at          TIMESTAMP
finance_approved_by     UUID → users
finance_approved_at     TIMESTAMP
final_approved_by       UUID → users
final_approved_at       TIMESTAMP
rejected_by             UUID → users
rejected_at             TIMESTAMP
rejection_reason        TEXT
created_by              UUID → users
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### job_candidates (45 columns - enhanced)
```
id                      UUID PK
candidate_number        VARCHAR
first_name              VARCHAR
last_name               VARCHAR
email                   VARCHAR
phone                   VARCHAR
gender                  VARCHAR
nationality             VARCHAR DEFAULT 'Iraqi'
education               VARCHAR
university              VARCHAR
specialization          VARCHAR
experience_years        INTEGER
current_employer        VARCHAR
current_position        VARCHAR (NEW)
total_experience_years  NUMERIC(5,2) (NEW)
highest_education       VARCHAR (NEW)
graduation_year         INTEGER (NEW)
current_salary          NUMERIC(12,2) (NEW)
expected_salary         NUMERIC
salary_negotiable       BOOLEAN (NEW)
notice_period_days      INTEGER (NEW)
current_address         TEXT (NEW)
current_city            VARCHAR (NEW)
current_country         VARCHAR DEFAULT 'Iraq' (NEW)
willing_to_relocate     BOOLEAN (NEW)
date_of_birth           DATE (NEW)
source                  VARCHAR
referral_employee       VARCHAR
referral_employee_id    UUID (NEW)
referral_notes          TEXT (NEW)
status                  VARCHAR
overall_status          VARCHAR DEFAULT 'NEW' (NEW)
is_blacklisted          BOOLEAN (NEW)
blacklist_reason        TEXT (NEW)
data_consent            BOOLEAN (NEW)
data_consent_date       TIMESTAMP (NEW)
marketing_consent       BOOLEAN (NEW)
vacancy_id              UUID
rejection_reason        TEXT
resume_url              TEXT
notes                   TEXT
workspace_id            UUID (NEW)
created_by              UUID (NEW)
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### job_vacancies (39 columns - enhanced)
```
id                      UUID PK
vacancy_number          VARCHAR
position                VARCHAR
department              VARCHAR
department_id           VARCHAR
openings                INTEGER
posting_date            DATE
deadline                DATE
status                  VARCHAR
priority                VARCHAR
grade                   VARCHAR
salary_min              NUMERIC
salary_max              NUMERIC
recruiter               VARCHAR
description             TEXT
requirements            TEXT
requisition_id          UUID (NEW)
reporting_to            UUID (NEW)
location                VARCHAR DEFAULT 'Baghdad' (NEW)
employment_type         VARCHAR DEFAULT 'FULL_TIME' (NEW)
hiring_manager_id       UUID (NEW)
recruiter_id            UUID (NEW)
job_description         TEXT (NEW)
responsibilities        TEXT (NEW)
required_qualifications TEXT (NEW)
preferred_qualifications TEXT (NEW)
benefits                TEXT (NEW)
salary_display_option   VARCHAR (NEW)
currency                VARCHAR DEFAULT 'IQD' (NEW)
salary_grade            VARCHAR (NEW)
is_published            BOOLEAN (NEW)
published_at            TIMESTAMP (NEW)
publish_on_career_page  BOOLEAN (NEW)
publish_externally      BOOLEAN (NEW)
external_job_boards     TEXT[] (NEW)
workspace_id            UUID (NEW)
created_by              UUID (NEW)
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

---

## API Endpoints

### Requisitions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recruitment/requisitions` | List all requisitions |
| POST | `/api/recruitment/requisitions` | Create new requisition |
| GET | `/api/recruitment/requisitions/[id]` | Get requisition details |
| PUT | `/api/recruitment/requisitions/[id]` | Update requisition |
| DELETE | `/api/recruitment/requisitions/[id]` | Delete DRAFT requisition |
| POST | `/api/recruitment/requisitions/[id]/submit` | Submit for approval |
| POST | `/api/recruitment/requisitions/[id]/approve` | Approve/reject |

---

## Data Flow

```
Department Manager creates Requisition (DRAFT)
    ↓
Submit for Approval → PENDING_HR
    ↓
HR Director approves → PENDING_FINANCE
    ↓
Finance Manager approves → PENDING_CEO
    ↓
CEO approves → APPROVED → Auto-creates Job Vacancy
    ↓
Vacancy published → Candidates apply → Applications tracked
    ↓
Pipeline stages → Interviews → Evaluations → Assessments
    ↓
Reference & Background checks → Offer → Negotiation → Hired
```

---

## Indexes

All tables include optimized indexes for:
- Workspace-level filtering
- Status-based queries
- Foreign key lookups
- Date-range queries
- Unique constraints where applicable

---

## Integration Points

- **employees** - Hiring managers, recruiters, referrals, interviewers
- **departments** - Department-level requisitions and vacancies
- **users** - Approvers, creators, evaluators
- **workspaces** - Multi-tenant workspace isolation

---

*Generated: April 29, 2026*
