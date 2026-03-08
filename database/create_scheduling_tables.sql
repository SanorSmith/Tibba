-- =====================================================
-- EMPLOYEE SCHEDULING SYSTEM
-- Complete work schedule management with shifts, breaks, and rotations
-- =====================================================

-- =====================================================
-- EMPLOYEE SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_schedules (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee & Shift
  employee_id           UUID NOT NULL,
  shift_id              UUID NOT NULL,
  
  -- Schedule Period
  effective_date        DATE NOT NULL,
  end_date              DATE,
  
  -- Schedule Type
  schedule_type         VARCHAR(20) DEFAULT 'REGULAR', -- REGULAR, TEMPORARY, OVERTIME, ROTATION
  rotation_pattern      VARCHAR(50), -- e.g., "5-2" (5 days on, 2 days off)
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  status                VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PENDING, CANCELLED
  
  -- Approval
  approved_by           UUID,
  approved_by_name      VARCHAR(255),
  approved_at           TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes                 TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT employee_schedules_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT employee_schedules_shift_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT employee_schedules_dates_check CHECK (end_date IS NULL OR end_date >= effective_date)
);

-- =====================================================
-- DAILY SCHEDULE DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_schedule_details (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Schedule Reference
  schedule_id           UUID NOT NULL,
  
  -- Day of Week (0=Sunday, 6=Saturday)
  day_of_week           INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Work Hours
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  
  -- Lunch Break
  lunch_start           TIME,
  lunch_end             TIME,
  lunch_duration_mins   INTEGER DEFAULT 60,
  
  -- Rest Breaks
  morning_break_start   TIME,
  morning_break_end     TIME,
  afternoon_break_start TIME,
  afternoon_break_end   TIME,
  break_duration_mins   INTEGER DEFAULT 15,
  
  -- Calculated Fields
  total_work_hours      DECIMAL(4,2),
  net_work_hours        DECIMAL(4,2), -- Total minus breaks
  
  -- Flexibility
  flexible_start        BOOLEAN DEFAULT false,
  flexible_end          BOOLEAN DEFAULT false,
  core_hours_start      TIME, -- Core hours when employee must be present
  core_hours_end        TIME,
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT daily_schedule_details_schedule_fkey FOREIGN KEY (schedule_id) REFERENCES employee_schedules(id) ON DELETE CASCADE,
  CONSTRAINT daily_schedule_details_times_check CHECK (end_time > start_time)
);

-- =====================================================
-- SCHEDULE EXCEPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Employee
  employee_id           UUID NOT NULL,
  
  -- Exception Details
  exception_date        DATE NOT NULL,
  exception_type        VARCHAR(30) NOT NULL, -- DAY_OFF, SCHEDULE_CHANGE, OVERTIME, EMERGENCY
  
  -- Modified Schedule (if applicable)
  modified_start_time   TIME,
  modified_end_time     TIME,
  modified_shift_id     UUID,
  
  -- Reason
  reason                TEXT,
  is_paid               BOOLEAN DEFAULT true,
  
  -- Approval
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approved_by           UUID,
  approved_by_name      VARCHAR(255),
  approved_at           TIMESTAMP WITH TIME ZONE,
  rejection_reason      TEXT,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT schedule_exceptions_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT schedule_exceptions_shift_fkey FOREIGN KEY (modified_shift_id) REFERENCES shifts(id)
);

-- =====================================================
-- SHIFT ROTATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_rotations (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Rotation Details
  rotation_name         VARCHAR(100) NOT NULL,
  rotation_code         VARCHAR(20) UNIQUE NOT NULL,
  description           TEXT,
  
  -- Pattern
  rotation_pattern      JSONB NOT NULL, -- Array of shift assignments
  cycle_length_days     INTEGER NOT NULL,
  
  -- Example: {"pattern": [{"day": 1, "shift_id": "uuid"}, ...]}
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID
);

-- =====================================================
-- EMPLOYEE ROTATION ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_rotation_assignments (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Assignment
  employee_id           UUID NOT NULL,
  rotation_id           UUID NOT NULL,
  
  -- Period
  start_date            DATE NOT NULL,
  end_date              DATE,
  
  -- Current Position in Rotation
  current_cycle_day     INTEGER DEFAULT 1,
  last_rotation_date    DATE,
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            UUID,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            UUID,
  
  -- Constraints
  CONSTRAINT employee_rotation_assignments_employee_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT employee_rotation_assignments_rotation_fkey FOREIGN KEY (rotation_id) REFERENCES shift_rotations(id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Employee Schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_id ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_shift_id ON employee_schedules(shift_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_dates ON employee_schedules(effective_date, end_date);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_status ON employee_schedules(status);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_organization_id ON employee_schedules(organization_id);

-- Daily Schedule Details
CREATE INDEX IF NOT EXISTS idx_daily_schedule_details_schedule_id ON daily_schedule_details(schedule_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_details_day_of_week ON daily_schedule_details(day_of_week);

-- Schedule Exceptions
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_employee_id ON schedule_exceptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_status ON schedule_exceptions(status);

-- Shift Rotations
CREATE INDEX IF NOT EXISTS idx_shift_rotations_code ON shift_rotations(rotation_code);
CREATE INDEX IF NOT EXISTS idx_shift_rotations_active ON shift_rotations(is_active);

-- Employee Rotation Assignments
CREATE INDEX IF NOT EXISTS idx_employee_rotation_assignments_employee_id ON employee_rotation_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_rotation_assignments_rotation_id ON employee_rotation_assignments(rotation_id);
CREATE INDEX IF NOT EXISTS idx_employee_rotation_assignments_dates ON employee_rotation_assignments(start_date, end_date);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for employee_schedules
CREATE TRIGGER update_employee_schedules_updated_at 
    BEFORE UPDATE ON employee_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for daily_schedule_details
CREATE TRIGGER update_daily_schedule_details_updated_at 
    BEFORE UPDATE ON daily_schedule_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for schedule_exceptions
CREATE TRIGGER update_schedule_exceptions_updated_at 
    BEFORE UPDATE ON schedule_exceptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for shift_rotations
CREATE TRIGGER update_shift_rotations_updated_at 
    BEFORE UPDATE ON shift_rotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for employee_rotation_assignments
CREATE TRIGGER update_employee_rotation_assignments_updated_at 
    BEFORE UPDATE ON employee_rotation_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE employee_schedules IS 'Employee work schedule assignments';
COMMENT ON TABLE daily_schedule_details IS 'Detailed daily schedule with work hours, breaks, and lunch times';
COMMENT ON TABLE schedule_exceptions IS 'Schedule exceptions and modifications for specific dates';
COMMENT ON TABLE shift_rotations IS 'Predefined shift rotation patterns';
COMMENT ON TABLE employee_rotation_assignments IS 'Employee assignments to rotation patterns';

COMMENT ON COLUMN daily_schedule_details.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN daily_schedule_details.net_work_hours IS 'Total work hours minus lunch and break times';
COMMENT ON COLUMN schedule_exceptions.exception_type IS 'DAY_OFF, SCHEDULE_CHANGE, OVERTIME, EMERGENCY';
COMMENT ON COLUMN shift_rotations.rotation_pattern IS 'JSONB array defining the rotation cycle';
