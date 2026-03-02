-- Performance Optimization Indexes (Fixed Version)
-- Description: Add indexes to improve query performance across all HR modules
-- Fixed column names to match actual table structure

-- ============================================================================
-- 1. ATTENDANCE RECORDS INDEXES
-- ============================================================================

-- Employee + Date lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
ON attendance_records(employee_id, attendance_date);

-- Date range queries for reports
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance_records(attendance_date DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON attendance_records(status) WHERE status != 'PRESENT';

-- Overtime queries
CREATE INDEX IF NOT EXISTS idx_attendance_overtime 
ON attendance_records(employee_id, attendance_date) 
WHERE overtime_hours > 0;

-- ============================================================================
-- 2. LEAVE REQUESTS INDEXES
-- ============================================================================

-- Employee + Status lookup
CREATE INDEX IF NOT EXISTS idx_leaves_employee_status 
ON leave_requests(employee_id, status);

-- Pending approvals
CREATE INDEX IF NOT EXISTS idx_leaves_pending 
ON leave_requests(status, created_at DESC) 
WHERE status IN ('PENDING', 'IN_REVIEW');

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_leaves_dates 
ON leave_requests(start_date, end_date);

-- Leave type filtering (fixed: leave_type_id instead of leave_type)
CREATE INDEX IF NOT EXISTS idx_leaves_type 
ON leave_requests(leave_type_id, status);

-- ============================================================================
-- 3. PAYROLL TRANSACTIONS INDEXES
-- ============================================================================

-- Period lookup (most common)
CREATE INDEX IF NOT EXISTS idx_payroll_period 
ON payroll_transactions(period_id, employee_id);

-- Employee payroll history
CREATE INDEX IF NOT EXISTS idx_payroll_employee 
ON payroll_transactions(employee_id, created_at DESC);

-- Status filtering (fixed: payment_status instead of status)
CREATE INDEX IF NOT EXISTS idx_payroll_status 
ON payroll_transactions(payment_status, period_id);

-- Amount queries for reports
CREATE INDEX IF NOT EXISTS idx_payroll_amounts 
ON payroll_transactions(period_id, net_salary);

-- ============================================================================
-- 4. EMPLOYEES INDEXES
-- ============================================================================

-- Department lookup
CREATE INDEX IF NOT EXISTS idx_employees_department 
ON employees(department_id) WHERE department_id IS NOT NULL;

-- Employment status (fixed: employment_status instead of status)
CREATE INDEX IF NOT EXISTS idx_employees_status 
ON employees(employment_status);

-- Active employees
CREATE INDEX IF NOT EXISTS idx_employees_active 
ON employees(employment_status, department_id) 
WHERE employment_status = 'ACTIVE';

-- Employee number lookup
CREATE INDEX IF NOT EXISTS idx_employees_number 
ON employees(employee_number);

-- Email lookup
CREATE INDEX IF NOT EXISTS idx_employees_email 
ON employees(email);

-- Position filtering
CREATE INDEX IF NOT EXISTS idx_employees_position 
ON employees(position);

-- ============================================================================
-- 5. DEPARTMENTS INDEXES
-- ============================================================================

-- Department code lookup
CREATE INDEX IF NOT EXISTS idx_departments_code 
ON departments(code);

-- Active departments
CREATE INDEX IF NOT EXISTS idx_departments_active 
ON departments(active) WHERE active = true;

-- Type filtering
CREATE INDEX IF NOT EXISTS idx_departments_type 
ON departments(type);

-- ============================================================================
-- 6. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Attendance summary by employee and month
CREATE INDEX IF NOT EXISTS idx_attendance_employee_month 
ON attendance_records(employee_id, EXTRACT(YEAR FROM attendance_date), EXTRACT(MONTH FROM attendance_date));

-- Leave requests by employee and year
CREATE INDEX IF NOT EXISTS idx_leaves_employee_year 
ON leave_requests(employee_id, EXTRACT(YEAR FROM start_date), status);

-- Payroll by period and department (via employee)
CREATE INDEX IF NOT EXISTS idx_payroll_period_employee 
ON payroll_transactions(period_id, employee_id, payment_status);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE attendance_records;
ANALYZE leave_requests;
ANALYZE payroll_transactions;
ANALYZE employees;
ANALYZE departments;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON INDEX idx_attendance_employee_date IS 'Optimize attendance lookups by employee and date';
COMMENT ON INDEX idx_leaves_employee_status IS 'Optimize leave request queries by employee and status';
COMMENT ON INDEX idx_payroll_period IS 'Optimize payroll queries by period';
COMMENT ON INDEX idx_employees_department IS 'Optimize employee queries by department';
COMMENT ON INDEX idx_employees_status IS 'Optimize employee queries by employment status';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes migration completed successfully!';
  RAISE NOTICE 'Fixed column names: leave_type_id, payment_status, employment_status';
END $$;
