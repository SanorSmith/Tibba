// ============= SHARED =============
export interface Address {
  street: string;
  city: string;
  governorate: string;
  postal_code?: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ============= EMPLOYEE & POSITION =============
export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name_arabic?: string;
  date_of_birth: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  marital_status: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  nationality: string;
  national_id: string;
  passport_number?: string;
  email: string;
  email_personal?: string;
  phone: string;
  address?: string;
  current_address?: Address;
  emergency_contact?: EmergencyContact;
  photo_url?: string;
  blood_type?: string;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY';
  employee_category: 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL';
  position_id?: string;
  job_title: string;
  department_id: string;
  department_name: string;
  reporting_to?: string;
  grade_id?: string;
  salary_grade?: string;
  basic_salary?: number;
  date_of_hire: string;
  employment_status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  bank_account_number?: string;
  bank_name?: string;
  biometric_id?: string;
  shift_id?: string;
  shift_pattern?: string;
  practitioner_id?: string;
  ehr_synced?: boolean;
  last_sync_date?: string;
  education?: EducationRecord[];
  licenses?: LicenseRecord[];
  certifications?: CertificationRecord[];
  experience?: ExperienceRecord[];
}

export interface EducationRecord {
  degree: string;
  institution: string;
  year: number;
  field?: string;
}

export interface LicenseRecord {
  type: string;
  number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

export interface CertificationRecord {
  name: string;
  issuer: string;
  date: string;
  expiry?: string;
}

export interface ExperienceRecord {
  position: string;
  organization: string;
  start_date: string;
  end_date: string;
}

export interface Department {
  id: string;
  code?: string;
  name: string;
  name_arabic?: string;
  type: 'CLINICAL' | 'SUPPORT' | 'ADMINISTRATIVE';
  parent_department_id?: string;
  head_id?: string;
  head_name?: string;
  staff_count?: number;
  budget?: number;
  is_active?: boolean;
}

export interface JobPosition {
  position_id: string;
  position_code: string;
  position_title: string;
  department_id: string;
  position_type: 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL';
  required_qualification: string;
  required_experience_years: number;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  grade_id: string;
  salary_range_min: number;
  salary_range_max: number;
  is_active: boolean;
}

// ============= RECRUITMENT =============
export interface JobVacancy {
  id: string;
  vacancy_number?: string;
  position: string;
  department: string;
  department_id?: string;
  openings: number;
  posting_date: string;
  deadline: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  grade?: string;
  salary_min: number;
  salary_max: number;
  requirements?: string[];
  assigned_recruiter_id?: string;
}

export interface Candidate {
  id: string;
  candidate_number?: string;
  first_name: string;
  last_name: string;
  full_name_arabic?: string;
  email: string;
  phone: string;
  education: string;
  experience_years: number;
  current_employer?: string;
  expected_salary: number;
  source: string;
  vacancy_id: string;
  status: 'NEW' | 'SCREENING' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED';
  applied_date: string;
  resume_url?: string;
  screening_score?: number;
  interview_score?: number;
  notes?: string;
}

export interface JobApplication {
  application_id: string;
  application_number: string;
  vacancy_id: string;
  candidate_id: string;
  application_date: string;
  application_status: 'SUBMITTED' | 'SCREENING' | 'INTERVIEW_SCHEDULED' | 'INTERVIEWED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'REJECTED' | 'HIRED';
  screening_score?: number;
  interview_score?: number;
  interview_date?: string;
  interview_notes?: string;
  offer_amount?: number;
  offer_date?: string;
  rejection_reason?: string;
}

export interface RecruitmentSummary {
  open_vacancies: number;
  total_candidates: number;
  avg_time_to_hire_days: number;
  offer_acceptance_rate: number;
  by_status: Record<string, number>;
}

// ============= ATTENDANCE =============
export interface AttendanceTransaction {
  transaction_id: string;
  employee_id: string;
  employee_name?: string;
  transaction_date: string;
  transaction_time: string;
  transaction_type: 'CHECK_IN' | 'CHECK_OUT';
  device_id?: string;
  entry_method: 'BIOMETRIC' | 'CARD' | 'MANUAL';
  is_manual_entry: boolean;
}

export interface DailyAttendanceSummary {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  date: string;
  shift?: string;
  shift_id?: string;
  first_in?: string;
  last_out?: string;
  total_hours: number;
  regular_hours?: number;
  overtime_hours: number;
  night_shift_hours?: number;
  late_minutes?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'LATE';
}

export interface AttendanceException {
  exception_id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  exception_date: string;
  exception_type: 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'MISSING_CHECKOUT' | 'ABNORMAL_HOURS' | 'UNAUTHORIZED_ABSENCE';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  review_status: 'PENDING' | 'JUSTIFIED' | 'WARNING_ISSUED' | 'DISMISSED';
  reviewed_by?: string;
  review_date?: string;
  justification?: string;
}

export interface ShiftPattern {
  id: string;
  name: string;
  type: 'FIXED' | 'ROTATING' | 'FLEXIBLE';
  start_time: string;
  end_time: string;
  total_hours: number;
  is_night_shift: boolean;
  break_minutes?: number;
  is_active: boolean;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  description?: string;
  hours_per_day: number;
  days_per_week: number;
  grace_period_minutes: number;
  overtime_rate_normal: number;
  overtime_rate_holiday?: number;
  night_shift_allowance_rate?: number;
  night_shift_start_time?: string;
  night_shift_end_time?: string;
  min_transaction_gap_minutes?: number;
  is_active: boolean;
}

export interface MonthlySummary {
  total_working_days: number;
  avg_attendance_rate: number;
  total_overtime_hours: number;
  total_late_arrivals: number;
  total_absent_days: number;
}

// ============= LEAVE MANAGEMENT =============
export interface LeaveType {
  id: string;
  name: string;
  category: 'PAID' | 'UNPAID' | 'HALF_PAID';
  max_days: number;
  carry_forward: boolean;
  max_carry_forward_days?: number;
  requires_documentation: boolean;
  min_notice_days?: number;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  request_number?: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  leave_type: string;
  leave_type_id?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approver_id?: string;
  approver_name?: string;
  approver_1_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_2_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  submitted_at?: string;
  approved_at?: string;
  is_half_day?: boolean;
  supporting_document?: string;
  contact_number?: string;
  approver_3_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_1_name?: string;
  approver_1_date?: string;
  approver_1_remarks?: string;
  approver_2_name?: string;
  approver_2_date?: string;
  approver_2_remarks?: string;
  approver_3_name?: string;
  approver_3_date?: string;
  approver_3_remarks?: string;
  rejected_by?: string;
  rejected_at?: string;
  last_updated_at?: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  leave_type_id?: string;
  year: number;
  accrued: number;
  taken: number;
  pending: number;
  available: number;
  carried_forward?: number;
}

export interface Holiday {
  id: string;
  name: string;
  name_arabic?: string;
  date: string;
  type: 'OFFICIAL' | 'RELIGIOUS' | 'NATIONAL';
  is_recurring: boolean;
}

// ============= PAYROLL =============
export interface SalaryGrade {
  id: string;
  code: string;
  name: string;
  min_salary: number;
  max_salary: number;
  currency: string;
  is_active: boolean;
}

export interface SalaryComponent {
  id: string;
  code: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  category: 'FIXED' | 'VARIABLE' | 'ALLOWANCE' | 'TAX' | 'LOAN_REPAYMENT' | 'SOCIAL_SECURITY';
  calculation_method: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_BASIC' | 'FORMULA';
  default_value?: number;
  percentage?: number;
  is_taxable: boolean;
  is_active: boolean;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_date?: string;
  status: 'OPEN' | 'PROCESSING' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CLOSED';
  total_employees: number;
  total_gross: number;
  total_deductions?: number;
  total_net: number;
}

export interface PayrollTransaction {
  transaction_id: string;
  period_id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  grade?: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance?: number;
  overtime_amount: number;
  night_shift_allowance?: number;
  other_earnings?: number;
  gross_salary: number;
  social_security_employee: number;
  social_security_employer?: number;
  income_tax: number;
  loan_repayment: number;
  advance_recovery?: number;
  absence_deduction: number;
  other_deductions?: number;
  total_deductions: number;
  net_salary: number;
  payment_status: 'PENDING' | 'PROCESSED' | 'COMPLETED';
  bank_account?: string;
  bank_name?: string;
}

export interface PayrollSummary {
  employee_id: string;
  employee_name: string;
  department: string;
  grade: string;
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
}

export interface PayrollTotalsByMonth {
  month: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
}

export interface Loan {
  id: string;
  loan_number?: string;
  employee_id: string;
  employee_name: string;
  loan_type: 'PERSONAL' | 'SALARY_ADVANCE' | 'EMERGENCY';
  amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  remaining_balance: number;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'PAID_OFF' | 'CANCELLED';
  start_date: string;
  end_date?: string;
  reason?: string;
  approved_by?: string;
  approved_date?: string;
}

export interface Advance {
  advance_id: string;
  advance_number: string;
  employee_id: string;
  employee_name: string;
  advance_amount: number;
  request_date: string;
  reason: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  recovery_method: 'SINGLE_DEDUCTION' | 'INSTALLMENTS';
  recovery_installments?: number;
  recovered_amount: number;
  status: 'ACTIVE' | 'RECOVERED';
}

export interface SocialSecurityContribution {
  period_id: string;
  employee_id: string;
  employee_name: string;
  basic_salary: number;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
}

export interface EndOfServiceProvision {
  employee_id: string;
  employee_name: string;
  department: string;
  date_of_hire: string;
  years_of_service: number;
  last_basic_salary: number;
  provision_amount: number;
}

// ============= TRAINING =============
export interface TrainingProgram {
  id: string;
  code?: string;
  name: string;
  type: 'ORIENTATION' | 'TECHNICAL' | 'COMPLIANCE' | 'MEDICAL_CME' | 'SAFETY';
  category: 'MANDATORY' | 'OPTIONAL';
  department?: string;
  duration_hours: number;
  cme_credits?: number;
  description?: string;
  provider?: string;
  is_active: boolean;
}

export interface TrainingSession {
  id: string;
  program_id: string;
  program_name?: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  instructor?: string;
  max_participants: number;
  enrolled_count: number;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
}

export interface TrainingEnrollment {
  enrollment_id: string;
  session_id: string;
  program_name?: string;
  employee_id: string;
  employee_name: string;
  enrollment_date: string;
  status: 'REGISTERED' | 'ATTENDED' | 'DID_NOT_ATTEND' | 'CANCELLED';
  assessment_score?: number;
  passed?: boolean;
  certificate_issued?: boolean;
  certificate_date?: string;
}

export interface EmployeeTrainingRecord {
  employee_id: string;
  employee_name: string;
  department: string;
  programs_completed: number;
  programs_in_progress: number;
  cme_credits_earned: number;
  cme_credits_required: number;
  compliance_status: string;
  next_due?: string;
}

export interface Certificate {
  certificate_id: string;
  employee_id: string;
  employee_name: string;
  program_id: string;
  program_name: string;
  certificate_number: string;
  completion_date: string;
  expiry_date?: string;
  cme_credits_earned?: number;
  status: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';
}

export interface TrainingSummary {
  total_programs: number;
  active_sessions: number;
  compliance_rate: number;
  expiring_certifications: number;
  total_cme_credits_earned: number;
}

// ============= PERFORMANCE =============
export interface PerformanceCycle {
  id: string;
  name: string;
  type: 'ANNUAL' | 'MID_YEAR' | 'PROBATION';
  start_date: string;
  end_date: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  cycle_id: string;
  cycle_name?: string;
  reviewer_name: string;
  review_type?: 'SELF' | 'MANAGER' | '360';
  overall_rating: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'FINALIZED';
  submitted_date?: string;
  finalized_date?: string;
  competencies?: CompetencyRating[];
  strengths?: string;
  improvements?: string;
  comments?: string;
}

export interface CompetencyRating {
  name: string;
  rating: number;
  max_rating: number;
}

export interface RatingDistribution {
  outstanding: number;
  exceeds_expectations: number;
  meets_expectations: number;
  needs_improvement: number;
  unsatisfactory: number;
}

export interface Goal {
  goal_id: string;
  employee_id: string;
  employee_name?: string;
  cycle_id: string;
  goal_title: string;
  goal_description?: string;
  goal_category: string;
  target_value: number;
  current_value: number;
  completion_percentage: number;
  weight?: number;
  due_date?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface Recognition {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  type: 'EMPLOYEE_OF_MONTH' | 'EXCELLENCE_AWARD' | 'SPOT_AWARD' | 'PEER_RECOGNITION';
  title: string;
  reason: string;
  date: string;
  awarded_by?: string;
  monetary_reward?: number;
}

// ============= BENEFITS =============
export interface BenefitPlan {
  id: string;
  name: string;
  type: 'HEALTH_INSURANCE' | 'TRANSPORT' | 'HOUSING' | 'MEAL' | 'MOBILE' | 'EDUCATION' | 'LIFE_INSURANCE';
  category: 'MANDATORY' | 'OPTIONAL' | 'EMPLOYER_PAID';
  description?: string;
  provider?: string;
  employee_cost: number;
  employer_cost: number;
  coverage?: string;
  eligible_categories?: string[];
  is_active: boolean;
}

export interface BenefitEnrollment {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  plan_id: string;
  plan_name: string;
  plan_type?: string;
  enrollment_date: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PENDING';
  employee_contribution: number;
  employer_contribution: number;
  dependents?: number;
}

export interface BenefitsSummary {
  total_enrolled: number;
  total_employer_cost_monthly: number;
  total_employee_cost_monthly: number;
  plans_count: number;
}

// ============= FORM INPUT TYPES =============
export interface EmployeeFormData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name_arabic?: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  marital_status: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  nationality: string;
  national_id: string;
  email: string;
  phone: string;
  address?: string;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY';
  employee_category: 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL';
  job_title: string;
  department_id: string;
  grade_id?: string;
  date_of_hire: string;
  shift_id?: string;
  bank_account_number?: string;
  bank_name?: string;
  basic_salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

export interface LeaveRequestFormData {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  is_half_day?: boolean;
}

export interface LoanFormData {
  employee_id: string;
  loan_type: 'PERSONAL' | 'SALARY_ADVANCE' | 'EMERGENCY';
  amount: number;
  number_of_installments: number;
  reason: string;
}

// ============= DATA FILE SHAPES =============
export interface EmployeesData {
  employees: Employee[];
}

export interface DepartmentsData {
  departments: Department[];
}

export interface AttendanceData {
  shifts: ShiftPattern[];
  policies: AttendancePolicy[];
  daily_summaries: DailyAttendanceSummary[];
  monthly_summary: MonthlySummary;
}

export interface LeavesData {
  leave_types: LeaveType[];
  holidays: Holiday[];
  leave_requests: LeaveRequest[];
  leave_balances: LeaveBalance[];
}

export interface PayrollData {
  salary_grades: SalaryGrade[];
  salary_components: SalaryComponent[];
  payroll_periods: PayrollPeriod[];
  payroll_summary: PayrollSummary[];
  payroll_totals_by_month: PayrollTotalsByMonth[];
  loans: Loan[];
}

export interface TrainingData {
  programs: TrainingProgram[];
  sessions: TrainingSession[];
  employee_training_records: EmployeeTrainingRecord[];
  training_summary: TrainingSummary;
}

export interface PerformanceData {
  cycles: PerformanceCycle[];
  reviews: PerformanceReview[];
  rating_distribution: RatingDistribution;
  recognitions: Recognition[];
}

export interface CandidatesData {
  vacancies: JobVacancy[];
  candidates: Candidate[];
  recruitment_summary: RecruitmentSummary;
}

export interface BenefitsData {
  benefit_plans: BenefitPlan[];
  enrollments: BenefitEnrollment[];
  benefits_summary: BenefitsSummary;
}
