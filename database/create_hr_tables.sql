-- =====================================================
-- HR SYSTEM DATABASE SCHEMA
-- Attendance, Leaves & Scheduling
-- =====================================================

-- =====================================================
-- LEAVE TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_types (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Leave Type Details
  name                  VARCHAR(100) NOT NULL,
  name_ar               VARCHAR(100),
  code                  VARCHAR(20) UNIQUE NOT NULL,
  description           TEXT,
  description_ar        TEXT,
  
  -- Leave Rules
  max_days_per_year     INTEGER DEFAULT 0,
  is_paid               BOOLEAN DEFAULT true,
  requires_approval     BOOLEAN DEFAULT true,
  min_notice_days       INTEGER DEFAULT 1,
  max_consecutive_days  INTEGER DEFAULT 365,
  
  -- Accrual Settings
  accrual_frequency     VARCHAR(20) DEFAULT 'YEARLY', -- YEARLY, MONTHLY, QUARTERLY
  accrual_rate          DECIMAL(5,2) DEFAULT 1.00,
  carry_forward_allowed BOOLEAN DEFAULT false,
  carry_forward_limit   INTEGER DEFAULT 0,
  
  -- Display
  color                 VARCHAR(7) DEFAULT '#3B82F6',
  icon                  VARCHAR(50),
  sort_order            INTEGER DEFAULT 0,
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- =====================================================
-- LEAVE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Leave Details
  leave_type_id         UUID NOT NULL REFERENCES leave_types(id),
  leave_type_code       VARCHAR(20),
  
  -- Dates
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  return_date           DATE,
  days_count            INTEGER NOT NULL,
  working_days_count    INTEGER DEFAULT 0,
  
  -- Request Details
  reason                TEXT,
  reason_ar             TEXT,
  emergency_contact     VARCHAR(20),
  emergency_reason      TEXT,
  
  -- Approval Workflow
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
  approved_by           UUID,
  approved_by_name      VARCHAR(255),
  approved_at           TIMESTAMP,
  rejection_reason      TEXT,
  
  -- Alternative Arrangements
  replacement_employee  UUID,
  replacement_name      VARCHAR(255),
  handover_notes        TEXT,
  
  -- Attachments
  attachments           JSONB, -- Store file references
  
  -- System
  request_source        VARCHAR(20) DEFAULT 'WEB', -- WEB, MOBILE, API
  ip_address            INET,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- =====================================================
-- LEAVE BALANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_balance (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee & Leave Type
  employee_id           UUID NOT NULL,
  leave_type_id         UUID NOT NULL REFERENCES leave_types(id),
  year                  INTEGER NOT NULL,
  
  -- Balance Tracking
  opening_balance       INTEGER DEFAULT 0,
  accrued               INTEGER DEFAULT 0,
  used                  INTEGER DEFAULT 0,
  carry_forwarded       INTEGER DEFAULT 0,
  encashed              INTEGER DEFAULT 0,
  forfeited             INTEGER DEFAULT 0,
  available_balance     INTEGER GENERATED ALWAYS AS (
    opening_balance + accrued + carry_forwarded - used - encashed - forfeited
  ) STORED,
  
  -- Last Updated
  last_accrual_date     DATE,
  last_used_date        DATE,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(employee_id, leave_type_id, year)
);

-- =====================================================
-- SHIFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shifts (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Shift Details
  name                  VARCHAR(100) NOT NULL,
  name_ar               VARCHAR(100),
  code                  VARCHAR(20) UNIQUE NOT NULL,
  description           TEXT,
  description_ar        TEXT,
  
  -- Timing
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  break_minutes         INTEGER DEFAULT 60,
  total_hours           DECIMAL(5,2) NOT NULL,
  
  -- Shift Properties
  is_night_shift        BOOLEAN DEFAULT false,
  is_weekend_shift      BOOLEAN DEFAULT false,
  is_holiday_shift      BOOLEAN DEFAULT false,
  grace_period_minutes  INTEGER DEFAULT 15,
  
  -- Overtime Rules
  overtime_start_after  INTEGER DEFAULT 0, -- Minutes after regular hours
  overtime_rate         DECIMAL(3,2) DEFAULT 1.50,
  
  -- Display
  color                 VARCHAR(7) DEFAULT '#3B82F6',
  sort_order            INTEGER DEFAULT 0,
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- =====================================================
-- SHIFT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_assignments (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Assignment Details
  employee_id           UUID NOT NULL,
  shift_id              UUID NOT NULL REFERENCES shifts(id),
  
  -- Validity Period
  start_date            DATE NOT NULL,
  end_date              DATE, -- NULL for ongoing assignments
  
  -- Assignment Properties
  is_active             BOOLEAN DEFAULT true,
  is_temporary          BOOLEAN DEFAULT false,
  rotation_pattern      VARCHAR(50), -- WEEKLY, MONTHLY, CUSTOM
  
  -- Approval
  approved_by           UUID,
  approved_at           TIMESTAMP,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- =====================================================
-- ATTENDANCE TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_transactions (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  
  -- Transaction Details
  transaction_type      VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  timestamp             TIMESTAMP WITH TIME ZONE NOT NULL,
  device_type           VARCHAR(50), -- BIOMETRIC, CARD, MOBILE, MANUAL
  device_id             VARCHAR(100),
  location              VARCHAR(100),
  
  -- Validation
  is_valid              BOOLEAN DEFAULT true,
  validation_status     VARCHAR(20), -- VALID, INVALID, DUPLICATE, OUT_OF_RANGE
  validation_message    TEXT,
  
  -- Processing
  processed             BOOLEAN DEFAULT false,
  processed_at          TIMESTAMP,
  daily_summary_id      UUID,
  
  -- System
  source                VARCHAR(20) DEFAULT 'DEVICE', -- DEVICE, API, MANUAL
  ip_address            INET,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255)
);

-- =====================================================
-- DAILY ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_attendance (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee & Date
  employee_id           UUID NOT NULL,
  employee_name         VARCHAR(255),
  employee_number       VARCHAR(50),
  date                  DATE NOT NULL,
  
  -- Attendance Summary
  first_in              TIMESTAMP WITH TIME ZONE,
  last_out              TIMESTAMP WITH TIME ZONE,
  total_hours           DECIMAL(5,2) DEFAULT 0,
  regular_hours         DECIMAL(5,2) DEFAULT 0,
  overtime_hours        DECIMAL(5,2) DEFAULT 0,
  
  -- Shift Information
  shift_id              UUID REFERENCES shifts(id),
  shift_name            VARCHAR(100),
  scheduled_start       TIME,
  scheduled_end         TIME,
  
  -- Status
  status                VARCHAR(20) DEFAULT 'PRESENT', -- PRESENT, ABSENT, LEAVE, HOLIDAY, WEEKEND
  attendance_score      DECIMAL(5,2) DEFAULT 100.00, -- Percentage
  
  -- Exceptions
  late_arrival_minutes  INTEGER DEFAULT 0,
  early_departure_min   INTEGER DEFAULT 0,
  break_minutes         INTEGER DEFAULT 0,
  abnormal_hours        BOOLEAN DEFAULT false,
  
  -- Processing
  processed             BOOLEAN DEFAULT false,
  processed_at          TIMESTAMP,
  processed_by          VARCHAR(255),
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(employee_id, date)
);

-- =====================================================
-- OFFICIAL HOLIDAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS official_holidays (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Holiday Details
  name                  VARCHAR(100) NOT NULL,
  name_ar               VARCHAR(100),
  date                  DATE NOT NULL,
  
  -- Properties
  is_recurring          BOOLEAN DEFAULT false, -- Repeats yearly
  is_paid_holiday       BOOLEAN DEFAULT true,
  is_optional           BOOLEAN DEFAULT false,
  
  -- Coverage
  affected_departments  JSONB, -- NULL for all departments
  affected_employees    JSONB, -- NULL for all employees
  
  -- Display
  color                 VARCHAR(7) DEFAULT '#EF4444',
  icon                  VARCHAR(50),
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Leave Types Indexes
CREATE INDEX IF NOT EXISTS idx_leave_types_code ON leave_types(code);
CREATE INDEX IF NOT EXISTS idx_leave_types_active ON leave_types(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);

-- Leave Requests Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organization_id);

-- Leave Balance Indexes
CREATE INDEX IF NOT EXISTS idx_leave_balance_employee_type ON leave_balance(employee_id, leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_year ON leave_balance(year);
CREATE INDEX IF NOT EXISTS idx_leave_balance_employee_year ON leave_balance(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_balance_org ON leave_balance(organization_id);

-- Shifts Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_code ON shifts(code);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);

-- Shift Assignments Indexes
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_dates ON shift_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_active ON shift_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_org ON shift_assignments(organization_id);

-- Attendance Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_employee ON attendance_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_timestamp ON attendance_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_type ON attendance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_processed ON attendance_transactions(processed);
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_org ON attendance_transactions(organization_id);

-- Daily Attendance Indexes
CREATE INDEX IF NOT EXISTS idx_daily_attendance_employee ON daily_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_status ON daily_attendance(status);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_employee_date ON daily_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_org ON daily_attendance(organization_id);

-- Official Holidays Indexes
CREATE INDEX IF NOT EXISTS idx_official_holidays_date ON official_holidays(date);
CREATE INDEX IF NOT EXISTS idx_official_holidays_recurring ON official_holidays(is_recurring);
CREATE INDEX IF NOT EXISTS idx_official_holidays_active ON official_holidays(is_active);
CREATE INDEX IF NOT EXISTS idx_official_holidays_org ON official_holidays(organization_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE leave_types IS 'Types of leaves available in the system (Annual, Sick, Emergency, etc.)';
COMMENT ON TABLE leave_requests IS 'Employee leave requests with approval workflow';
COMMENT ON TABLE leave_balance IS 'Leave balance tracking for each employee by leave type and year';
COMMENT ON TABLE shifts IS 'Shift definitions with timing and overtime rules';
COMMENT ON TABLE shift_assignments IS 'Employee shift assignments with validity periods';
COMMENT ON TABLE attendance_transactions IS 'Raw attendance transactions from devices or manual entry';
COMMENT ON TABLE daily_attendance IS 'Processed daily attendance summaries';
COMMENT ON TABLE official_holidays IS 'Official holidays with recurring options';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Disable RLS for development (enable in production)
ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE official_holidays DISABLE ROW LEVEL SECURITY;
