-- Performance Optimization Indexes
-- Description: Add indexes to improve query performance across all HR modules

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

-- Shift type filtering
CREATE INDEX IF NOT EXISTS idx_attendance_shift_type 
ON attendance_records(shift_type) WHERE shift_type IS NOT NULL;

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

-- Leave type filtering
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

-- Status filtering
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

-- Employment status
CREATE INDEX IF NOT EXISTS idx_employees_status 
ON employees(employment_status);

-- Active employees
CREATE INDEX IF NOT EXISTS idx_employees_active 
ON employees(employment_status, department_id) 
WHERE employment_status = 'active';

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
-- 6. SHIFTS INDEXES
-- ============================================================================

-- Shift type lookup
CREATE INDEX IF NOT EXISTS idx_shifts_type 
ON shifts(shift_type);

-- Active shifts
CREATE INDEX IF NOT EXISTS idx_shifts_active 
ON shifts(is_active) WHERE is_active = true;

-- ============================================================================
-- 7. SHIFT SCHEDULES INDEXES
-- ============================================================================

-- Employee + Date lookup
CREATE INDEX IF NOT EXISTS idx_shift_schedules_employee_date 
ON shift_schedules(employee_id, schedule_date);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date 
ON shift_schedules(schedule_date DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_shift_schedules_status 
ON shift_schedules(status, schedule_date);

-- ============================================================================
-- 8. ALERTS INDEXES
-- ============================================================================

-- Employee + Read status
CREATE INDEX IF NOT EXISTS idx_alerts_employee_read 
ON alerts(employee_id, is_read, created_at DESC);

-- Unread alerts
CREATE INDEX IF NOT EXISTS idx_alerts_unread 
ON alerts(employee_id, created_at DESC) 
WHERE is_read = false;

-- Alert type filtering
CREATE INDEX IF NOT EXISTS idx_alerts_type_severity 
ON alerts(alert_type, severity, created_at DESC);

-- ============================================================================
-- 9. APPROVAL WORKFLOWS INDEXES
-- ============================================================================

-- Entity lookup
CREATE INDEX IF NOT EXISTS idx_workflows_entity 
ON approval_workflows(entity_type, entity_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_workflows_status 
ON approval_workflows(status, submitted_at DESC);

-- Submitter lookup
CREATE INDEX IF NOT EXISTS idx_workflows_submitter 
ON approval_workflows(submitted_by, status);

-- ============================================================================
-- 10. APPROVAL STEPS INDEXES
-- ============================================================================

-- Workflow lookup
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow 
ON approval_steps(workflow_id, level);

-- Approver pending tasks
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver_pending 
ON approval_steps(approver_id, status) 
WHERE status = 'pending';

-- ============================================================================
-- 11. NOTIFICATION QUEUE INDEXES
-- ============================================================================

-- Pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_pending 
ON notification_queue(status, scheduled_for) 
WHERE status = 'pending';

-- Recipient lookup
CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
ON notification_queue(recipient_id, created_at DESC);

-- Type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notification_queue(notification_type, status);

-- ============================================================================
-- 12. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Attendance summary by employee and month
CREATE INDEX IF NOT EXISTS idx_attendance_employee_month 
ON attendance_records(employee_id, EXTRACT(YEAR FROM attendance_date), EXTRACT(MONTH FROM attendance_date));

-- Leave requests by employee and year
CREATE INDEX IF NOT EXISTS idx_leaves_employee_year 
ON leave_requests(employee_id, EXTRACT(YEAR FROM start_date), status);

-- Payroll by period and department (via employee)
CREATE INDEX IF NOT EXISTS idx_payroll_period_employee 
ON payroll_transactions(period_id, employee_id, status);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE attendance_records;
ANALYZE leave_requests;
ANALYZE payroll_transactions;
ANALYZE employees;
ANALYZE departments;
ANALYZE shifts;
ANALYZE shift_schedules;
ANALYZE alerts;
ANALYZE approval_workflows;
ANALYZE approval_steps;
ANALYZE notification_queue;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON INDEX idx_attendance_employee_date IS 'Optimize attendance lookups by employee and date';
COMMENT ON INDEX idx_leaves_employee_status IS 'Optimize leave request queries by employee and status';
COMMENT ON INDEX idx_payroll_period IS 'Optimize payroll queries by period';
COMMENT ON INDEX idx_employees_department IS 'Optimize employee queries by department';
COMMENT ON INDEX idx_employees_status IS 'Optimize employee queries by employment status';
