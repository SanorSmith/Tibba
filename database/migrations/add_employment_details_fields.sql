-- =====================================================
-- ADD MISSING EMPLOYMENT DETAILS FIELDS TO STAFF TABLE
-- This migration adds fields needed by the Employment Details form
-- =====================================================

-- Position Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_category TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_hire DATE;

-- Compensation Information  
ALTER TABLE staff ADD COLUMN IF NOT EXISTS grade_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(15,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS shift_id TEXT;

-- Bank Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN staff.job_title IS 'Employee job title or position';
COMMENT ON COLUMN staff.department_id IS 'Department identifier (foreign key reference)';
COMMENT ON COLUMN staff.employee_category IS 'Employee category: DOCTOR, NURSE, ADMINISTRATIVE, etc.';
COMMENT ON COLUMN staff.employment_type IS 'Employment type: FULL_TIME, PART_TIME, CONTRACT, etc.';
COMMENT ON COLUMN staff.date_of_hire IS 'Date when employee was hired';
COMMENT ON COLUMN staff.grade_id IS 'Salary grade identifier';
COMMENT ON COLUMN staff.basic_salary IS 'Monthly basic salary in local currency';
COMMENT ON COLUMN staff.shift_id IS 'Shift pattern identifier';
COMMENT ON COLUMN staff.bank_name IS 'Bank name for salary deposits';
COMMENT ON COLUMN staff.bank_account_number IS 'Bank account number for salary deposits';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_job_title ON staff(job_title);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_category ON staff(employee_category);
CREATE INDEX IF NOT EXISTS idx_staff_employment_type ON staff(employment_type);
CREATE INDEX IF NOT EXISTS idx_staff_date_of_hire ON staff(date_of_hire);
CREATE INDEX IF NOT EXISTS idx_staff_grade_id ON staff(grade_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_id ON staff(shift_id);
