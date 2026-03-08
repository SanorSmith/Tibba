-- =====================================================
-- COMPREHENSIVE PAYROLL SYSTEM
-- Database Migration Script
-- =====================================================

-- =====================================================
-- 1. SALARY GRADES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_grades (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Grade Details
  grade_code            VARCHAR(20) UNIQUE NOT NULL,
  grade_name            VARCHAR(100) NOT NULL,
  grade_name_ar         VARCHAR(100),
  grade_level           INTEGER NOT NULL,
  description           TEXT,
  
  -- Salary Range
  min_salary            DECIMAL(12,2) NOT NULL,
  max_salary            DECIMAL(12,2) NOT NULL,
  standard_salary       DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Standard Allowances
  housing_allowance     DECIMAL(12,2) DEFAULT 0,
  transport_allowance   DECIMAL(12,2) DEFAULT 0,
  meal_allowance        DECIMAL(12,2) DEFAULT 0,
  other_allowances      JSONB,
  
  -- Allowance Percentages (if based on basic salary)
  housing_percentage    DECIMAL(5,2),
  transport_percentage  DECIMAL(5,2),
  meal_percentage       DECIMAL(5,2),
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT salary_grades_min_max_check CHECK (min_salary <= max_salary),
  CONSTRAINT salary_grades_standard_check CHECK (standard_salary BETWEEN min_salary AND max_salary)
);

-- =====================================================
-- 2. EMPLOYEE COMPENSATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_compensation (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee & Grade
  employee_id           UUID NOT NULL,
  salary_grade_id       UUID REFERENCES salary_grades(id),
  
  -- Salary Details
  basic_salary          DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Allowances
  housing_allowance     DECIMAL(12,2) DEFAULT 0,
  transport_allowance   DECIMAL(12,2) DEFAULT 0,
  meal_allowance        DECIMAL(12,2) DEFAULT 0,
  other_allowances      JSONB,
  
  -- Total Package
  total_package         DECIMAL(12,2) GENERATED ALWAYS AS (
    basic_salary + housing_allowance + transport_allowance + meal_allowance
  ) STORED,
  
  -- Validity Period
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  is_active             BOOLEAN DEFAULT true,
  
  -- Approval
  approved_by           UUID,
  approved_at           TIMESTAMP WITH TIME ZONE,
  approval_notes        TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT employee_compensation_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- =====================================================
-- 3. PAYROLL PERIODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Period Details
  period_name           VARCHAR(100) NOT NULL,
  period_code           VARCHAR(20) UNIQUE NOT NULL,
  period_type           VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, SEMI_MONTHLY, WEEKLY, BIWEEKLY
  
  -- Dates
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  payment_date          DATE,
  
  -- Status
  status                VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, CALCULATING, CALCULATED, APPROVED, PROCESSING, PAID, CLOSED
  
  -- Summary
  total_employees       INTEGER DEFAULT 0,
  total_gross           DECIMAL(15,2) DEFAULT 0,
  total_deductions      DECIMAL(15,2) DEFAULT 0,
  total_net             DECIMAL(15,2) DEFAULT 0,
  
  -- Processing
  calculation_started_at TIMESTAMP WITH TIME ZONE,
  calculation_completed_at TIMESTAMP WITH TIME ZONE,
  processed_by          UUID,
  processed_at          TIMESTAMP WITH TIME ZONE,
  
  -- Approval
  approved_by           UUID,
  approved_at           TIMESTAMP WITH TIME ZONE,
  approval_notes        TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT payroll_periods_dates_check CHECK (end_date >= start_date)
);

-- =====================================================
-- 4. PAYROLL TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_transactions (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Period & Employee
  period_id             UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL,
  employee_number       VARCHAR(50),
  employee_name         VARCHAR(255),
  department            VARCHAR(100),
  salary_grade          VARCHAR(20),
  
  -- Earnings
  basic_salary          DECIMAL(12,2) DEFAULT 0,
  housing_allowance     DECIMAL(12,2) DEFAULT 0,
  transport_allowance   DECIMAL(12,2) DEFAULT 0,
  meal_allowance        DECIMAL(12,2) DEFAULT 0,
  overtime_pay          DECIMAL(12,2) DEFAULT 0,
  night_shift_pay       DECIMAL(12,2) DEFAULT 0,
  weekend_pay           DECIMAL(12,2) DEFAULT 0,
  holiday_pay           DECIMAL(12,2) DEFAULT 0,
  hazard_pay            DECIMAL(12,2) DEFAULT 0,
  bonuses               DECIMAL(12,2) DEFAULT 0,
  other_earnings        JSONB,
  gross_salary          DECIMAL(12,2) DEFAULT 0,
  
  -- Deductions
  social_security       DECIMAL(12,2) DEFAULT 0,
  health_insurance      DECIMAL(12,2) DEFAULT 0,
  income_tax            DECIMAL(12,2) DEFAULT 0,
  loan_deduction        DECIMAL(12,2) DEFAULT 0,
  advance_deduction     DECIMAL(12,2) DEFAULT 0,
  absence_deduction     DECIMAL(12,2) DEFAULT 0,
  other_deductions      JSONB,
  total_deductions      DECIMAL(12,2) DEFAULT 0,
  
  -- Net Pay
  net_salary            DECIMAL(12,2) DEFAULT 0,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Calculation Details
  worked_days           INTEGER DEFAULT 0,
  absent_days           INTEGER DEFAULT 0,
  leave_days            INTEGER DEFAULT 0,
  overtime_hours        DECIMAL(5,2) DEFAULT 0,
  night_shifts          INTEGER DEFAULT 0,
  weekend_shifts        INTEGER DEFAULT 0,
  holiday_shifts        INTEGER DEFAULT 0,
  is_pro_rata           BOOLEAN DEFAULT false,
  pro_rata_days         INTEGER,
  
  -- Metadata
  calculation_metadata  JSONB,
  warnings              TEXT[],
  errors                TEXT[],
  
  -- Status
  status                VARCHAR(20) DEFAULT 'CALCULATED', -- CALCULATED, APPROVED, PAID, CANCELLED, ON_HOLD
  payment_method        VARCHAR(20), -- BANK_TRANSFER, CASH, CHEQUE
  payment_reference     VARCHAR(100),
  paid_at               TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  calculated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculated_by         UUID,
  approved_at           TIMESTAMP WITH TIME ZONE,
  approved_by           UUID,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(period_id, employee_id)
);

-- =====================================================
-- 5. EMPLOYEE LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_loans (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Loan Details
  loan_number           VARCHAR(50) UNIQUE NOT NULL,
  loan_type             VARCHAR(50) DEFAULT 'PERSONAL', -- PERSONAL, EMERGENCY, HOUSING, EDUCATION
  loan_amount           DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Repayment
  monthly_installment   DECIMAL(12,2) NOT NULL,
  total_installments    INTEGER NOT NULL,
  paid_installments     INTEGER DEFAULT 0,
  remaining_balance     DECIMAL(12,2),
  
  -- Dates
  loan_date             DATE NOT NULL,
  start_date            DATE NOT NULL,
  end_date              DATE,
  
  -- Interest
  interest_rate         DECIMAL(5,2) DEFAULT 0,
  interest_amount       DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED, DEFAULTED
  
  -- Approval
  approved_by           UUID,
  approved_at           TIMESTAMP WITH TIME ZONE,
  approval_notes        TEXT,
  
  -- Reason
  reason                TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT employee_loans_amount_check CHECK (loan_amount > 0),
  CONSTRAINT employee_loans_installment_check CHECK (monthly_installment > 0)
);

-- =====================================================
-- 6. EMPLOYEE ADVANCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_advances (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Advance Details
  advance_number        VARCHAR(50) UNIQUE NOT NULL,
  advance_amount        DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Deduction
  deduction_amount      DECIMAL(12,2) NOT NULL,
  deduction_months      INTEGER NOT NULL,
  deducted_months       INTEGER DEFAULT 0,
  remaining_balance     DECIMAL(12,2),
  
  -- Dates
  request_date          DATE NOT NULL,
  deduction_start_date  DATE NOT NULL,
  
  -- Status
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, DEDUCTING, COMPLETED, CANCELLED
  
  -- Approval
  approved_by           UUID,
  approved_at           TIMESTAMP WITH TIME ZONE,
  approval_notes        TEXT,
  
  -- Reason
  reason                TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT employee_advances_amount_check CHECK (advance_amount > 0),
  CONSTRAINT employee_advances_deduction_check CHECK (deduction_amount > 0)
);

-- =====================================================
-- 7. SOCIAL SECURITY RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS social_security_rules (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Rule Details
  rule_name             VARCHAR(100) NOT NULL,
  rule_code             VARCHAR(20) UNIQUE NOT NULL,
  country_code          VARCHAR(3),
  region                VARCHAR(100),
  
  -- Contribution Rates
  employee_contribution_rate DECIMAL(5,2) NOT NULL, -- e.g., 9.00 for 9%
  employer_contribution_rate DECIMAL(5,2) NOT NULL, -- e.g., 9.00 for 9%
  
  -- Caps
  min_salary_cap        DECIMAL(12,2),
  max_salary_cap        DECIMAL(12,2),
  
  -- Validity
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID
);

-- =====================================================
-- 8. END OF SERVICE PROVISIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS end_of_service_provisions (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Service Details
  hire_date             DATE NOT NULL,
  years_of_service      DECIMAL(5,2),
  months_of_service     INTEGER,
  
  -- Calculation
  calculation_basis     VARCHAR(20) DEFAULT 'LAST_SALARY', -- LAST_SALARY, AVERAGE_SALARY
  basic_salary          DECIMAL(12,2),
  total_allowances      DECIMAL(12,2),
  daily_rate            DECIMAL(12,2),
  
  -- Entitlement
  days_entitled         INTEGER,
  provision_amount      DECIMAL(12,2),
  accrued_amount        DECIMAL(12,2),
  
  -- Calculation Details
  years_1_to_5_days     INTEGER DEFAULT 0,
  years_6_plus_days     INTEGER DEFAULT 0,
  calculation_metadata  JSONB,
  
  -- Status
  last_calculation_date DATE,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(employee_id)
);

-- =====================================================
-- 9. BANK TRANSFERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_transfers (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Period
  period_id             UUID NOT NULL REFERENCES payroll_periods(id),
  
  -- Batch Details
  batch_number          VARCHAR(50) UNIQUE NOT NULL,
  batch_date            DATE NOT NULL,
  
  -- Bank Details
  bank_name             VARCHAR(100),
  bank_code             VARCHAR(20),
  
  -- File Details
  file_format           VARCHAR(20), -- WPS, SWIFT, LOCAL_CSV
  file_path             VARCHAR(500),
  file_name             VARCHAR(255),
  file_generated_at     TIMESTAMP WITH TIME ZONE,
  
  -- Summary
  total_amount          DECIMAL(15,2) NOT NULL,
  total_employees       INTEGER NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Status
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, GENERATED, SENT, CONFIRMED, FAILED
  
  -- Processing
  sent_at               TIMESTAMP WITH TIME ZONE,
  confirmed_at          TIMESTAMP WITH TIME ZONE,
  confirmation_reference VARCHAR(100),
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID
);

-- =====================================================
-- 10. BANK TRANSFER DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_transfer_details (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- References
  bank_transfer_id      UUID NOT NULL REFERENCES bank_transfers(id) ON DELETE CASCADE,
  payroll_transaction_id UUID NOT NULL REFERENCES payroll_transactions(id),
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Bank Details
  account_number        VARCHAR(50),
  iban                  VARCHAR(50),
  bank_name             VARCHAR(100),
  bank_code             VARCHAR(20),
  branch_code           VARCHAR(20),
  
  -- Amount
  amount                DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'USD',
  
  -- Status
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, CONFIRMED, FAILED, RETURNED
  
  -- Processing
  processed_at          TIMESTAMP WITH TIME ZONE,
  error_message         TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. PAYSLIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payslips (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- References
  payroll_transaction_id UUID NOT NULL REFERENCES payroll_transactions(id) ON DELETE CASCADE,
  period_id             UUID NOT NULL REFERENCES payroll_periods(id),
  employee_id           UUID NOT NULL,
  
  -- Payslip Details
  payslip_number        VARCHAR(50) UNIQUE NOT NULL,
  payslip_month         VARCHAR(20),
  payslip_year          INTEGER,
  
  -- File
  pdf_path              VARCHAR(500),
  pdf_generated_at      TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status                VARCHAR(20) DEFAULT 'GENERATED', -- GENERATED, SENT, VIEWED, DOWNLOADED
  
  -- Tracking
  sent_at               TIMESTAMP WITH TIME ZONE,
  viewed_at             TIMESTAMP WITH TIME ZONE,
  downloaded_at         TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(payroll_transaction_id)
);

-- =====================================================
-- 12. CURRENCY EXCHANGE RATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Currency Pair
  from_currency         VARCHAR(3) NOT NULL,
  to_currency           VARCHAR(3) NOT NULL,
  
  -- Rate
  exchange_rate         DECIMAL(12,6) NOT NULL,
  
  -- Validity
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  is_active             BOOLEAN DEFAULT true,
  
  -- Source
  source                VARCHAR(50), -- MANUAL, CENTRAL_BANK, API
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT currency_exchange_rates_check CHECK (from_currency != to_currency)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Salary Grades
CREATE INDEX IF NOT EXISTS idx_salary_grades_code ON salary_grades(grade_code);
CREATE INDEX IF NOT EXISTS idx_salary_grades_level ON salary_grades(grade_level);
CREATE INDEX IF NOT EXISTS idx_salary_grades_active ON salary_grades(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_grades_org ON salary_grades(organization_id);

-- Employee Compensation
CREATE INDEX IF NOT EXISTS idx_employee_compensation_employee ON employee_compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_grade ON employee_compensation(salary_grade_id);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_active ON employee_compensation(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_dates ON employee_compensation(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_org ON employee_compensation(organization_id);

-- Payroll Periods
CREATE INDEX IF NOT EXISTS idx_payroll_periods_code ON payroll_periods(period_code);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org ON payroll_periods(organization_id);

-- Payroll Transactions
CREATE INDEX IF NOT EXISTS idx_payroll_transactions_period ON payroll_transactions(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_transactions_employee ON payroll_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_transactions_status ON payroll_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payroll_transactions_org ON payroll_transactions(organization_id);

-- Employee Loans
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_number ON employee_loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_employee_loans_status ON employee_loans(status);
CREATE INDEX IF NOT EXISTS idx_employee_loans_org ON employee_loans(organization_id);

-- Employee Advances
CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_number ON employee_advances(advance_number);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);
CREATE INDEX IF NOT EXISTS idx_employee_advances_org ON employee_advances(organization_id);

-- Social Security Rules
CREATE INDEX IF NOT EXISTS idx_social_security_rules_code ON social_security_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_social_security_rules_active ON social_security_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_social_security_rules_dates ON social_security_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_social_security_rules_org ON social_security_rules(organization_id);

-- End of Service Provisions
CREATE INDEX IF NOT EXISTS idx_end_of_service_provisions_employee ON end_of_service_provisions(employee_id);
CREATE INDEX IF NOT EXISTS idx_end_of_service_provisions_org ON end_of_service_provisions(organization_id);

-- Bank Transfers
CREATE INDEX IF NOT EXISTS idx_bank_transfers_period ON bank_transfers(period_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_batch ON bank_transfers(batch_number);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON bank_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_org ON bank_transfers(organization_id);

-- Bank Transfer Details
CREATE INDEX IF NOT EXISTS idx_bank_transfer_details_transfer ON bank_transfer_details(bank_transfer_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_details_transaction ON bank_transfer_details(payroll_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_details_employee ON bank_transfer_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_details_org ON bank_transfer_details(organization_id);

-- Payslips
CREATE INDEX IF NOT EXISTS idx_payslips_transaction ON payslips(payroll_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_number ON payslips(payslip_number);
CREATE INDEX IF NOT EXISTS idx_payslips_org ON payslips(organization_id);

-- Currency Exchange Rates
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_pair ON currency_exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_active ON currency_exchange_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_dates ON currency_exchange_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_org ON currency_exchange_rates(organization_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE salary_grades IS 'Salary grade definitions with ranges and allowances';
COMMENT ON TABLE employee_compensation IS 'Employee salary and allowance assignments';
COMMENT ON TABLE payroll_periods IS 'Payroll processing periods (monthly, semi-monthly, etc.)';
COMMENT ON TABLE payroll_transactions IS 'Individual employee payroll calculations';
COMMENT ON TABLE employee_loans IS 'Employee loan records with repayment schedules';
COMMENT ON TABLE employee_advances IS 'Employee salary advances with deduction schedules';
COMMENT ON TABLE social_security_rules IS 'Social security contribution rules by region';
COMMENT ON TABLE end_of_service_provisions IS 'End of service benefit calculations';
COMMENT ON TABLE bank_transfers IS 'Bank transfer batch records';
COMMENT ON TABLE bank_transfer_details IS 'Individual bank transfer details';
COMMENT ON TABLE payslips IS 'Generated payslip records';
COMMENT ON TABLE currency_exchange_rates IS 'Currency exchange rates for multi-currency support';
