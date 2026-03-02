-- ============================================================================
-- HR DATA MIGRATION VALIDATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify data integrity
-- ============================================================================

-- 1. ROW COUNT COMPARISON
-- ============================================================================
SELECT 'departments' as table_name, COUNT(*) as record_count FROM departments
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'payroll_transactions', COUNT(*) FROM payroll_transactions
ORDER BY table_name;

-- 2. CHECK FOR ORPHANED FOREIGN KEYS
-- ============================================================================

-- Employees with invalid department references
SELECT 
  'employees_invalid_dept' as issue,
  COUNT(*) as count
FROM employees e
WHERE e.department_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id);

-- Attendance records with invalid employee references
SELECT 
  'attendance_invalid_emp' as issue,
  COUNT(*) as count
FROM attendance_records ar
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = ar.employee_id);

-- Leave requests with invalid employee references
SELECT 
  'leaves_invalid_emp' as issue,
  COUNT(*) as count
FROM leave_requests lr
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = lr.employee_id);

-- Payroll transactions with invalid employee references
SELECT 
  'payroll_invalid_emp' as issue,
  COUNT(*) as count
FROM payroll_transactions pt
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = pt.employee_id);

-- 3. CHECK FOR DUPLICATE RECORDS
-- ============================================================================

-- Duplicate employee numbers
SELECT 
  employee_number,
  COUNT(*) as duplicate_count
FROM employees
GROUP BY employee_number
HAVING COUNT(*) > 1;

-- Duplicate national IDs
SELECT 
  national_id,
  COUNT(*) as duplicate_count
FROM employees
WHERE national_id IS NOT NULL
GROUP BY national_id
HAVING COUNT(*) > 1;

-- 4. DATA QUALITY CHECKS
-- ============================================================================

-- Employees without required fields
SELECT 
  'employees_missing_name' as issue,
  COUNT(*) as count
FROM employees
WHERE first_name IS NULL OR last_name IS NULL;

-- Employees without department
SELECT 
  'employees_no_dept' as issue,
  COUNT(*) as count
FROM employees
WHERE department_id IS NULL;

-- Employees with invalid employment status
SELECT 
  'employees_invalid_status' as issue,
  COUNT(*) as count
FROM employees
WHERE employment_status NOT IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED');

-- Attendance records without date
SELECT 
  'attendance_no_date' as issue,
  COUNT(*) as count
FROM attendance_records
WHERE attendance_date IS NULL;

-- Leave requests with invalid date range
SELECT 
  'leaves_invalid_dates' as issue,
  COUNT(*) as count
FROM leave_requests
WHERE start_date > end_date;

-- 5. SUMMARY STATISTICS
-- ============================================================================

-- Employee distribution by department
SELECT 
  d.name as department,
  d.code,
  COUNT(e.id) as employee_count,
  COUNT(CASE WHEN e.employment_status = 'ACTIVE' THEN 1 END) as active_count
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name, d.code
ORDER BY employee_count DESC;

-- Employee distribution by employment type
SELECT 
  employment_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees), 2) as percentage
FROM employees
GROUP BY employment_type
ORDER BY count DESC;

-- Employee distribution by status
SELECT 
  employment_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees), 2) as percentage
FROM employees
GROUP BY employment_status
ORDER BY count DESC;

-- Attendance records by month
SELECT 
  TO_CHAR(attendance_date, 'YYYY-MM') as month,
  COUNT(*) as record_count,
  COUNT(DISTINCT employee_id) as unique_employees
FROM attendance_records
GROUP BY TO_CHAR(attendance_date, 'YYYY-MM')
ORDER BY month DESC
LIMIT 12;

-- Leave requests by status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(total_days), 2) as avg_days
FROM leave_requests
GROUP BY status
ORDER BY count DESC;

-- 6. METADATA VALIDATION
-- ============================================================================

-- Check if original IDs are preserved in metadata
SELECT 
  'employees_with_metadata' as metric,
  COUNT(*) as count
FROM employees
WHERE metadata IS NOT NULL 
  AND metadata->>'original_id' IS NOT NULL;

SELECT 
  'attendance_with_metadata' as metric,
  COUNT(*) as count
FROM attendance_records
WHERE metadata IS NOT NULL 
  AND metadata->>'original_id' IS NOT NULL;

-- 7. DATE RANGE VALIDATION
-- ============================================================================

-- Employee hire date range
SELECT 
  'employee_hire_dates' as metric,
  MIN(hire_date) as earliest,
  MAX(hire_date) as latest,
  COUNT(*) as total
FROM employees
WHERE hire_date IS NOT NULL;

-- Attendance date range
SELECT 
  'attendance_dates' as metric,
  MIN(attendance_date) as earliest,
  MAX(attendance_date) as latest,
  COUNT(*) as total
FROM attendance_records
WHERE attendance_date IS NOT NULL;

-- Leave request date range
SELECT 
  'leave_dates' as metric,
  MIN(start_date) as earliest,
  MAX(end_date) as latest,
  COUNT(*) as total
FROM leave_requests;

-- 8. REFERENTIAL INTEGRITY SUMMARY
-- ============================================================================

SELECT 
  'Total Departments' as metric,
  COUNT(*) as value
FROM departments

UNION ALL

SELECT 
  'Total Employees',
  COUNT(*)
FROM employees

UNION ALL

SELECT 
  'Employees with Valid Dept',
  COUNT(*)
FROM employees e
WHERE e.department_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id)

UNION ALL

SELECT 
  'Total Attendance Records',
  COUNT(*)
FROM attendance_records

UNION ALL

SELECT 
  'Attendance with Valid Employee',
  COUNT(*)
FROM attendance_records ar
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = ar.employee_id)

UNION ALL

SELECT 
  'Total Leave Requests',
  COUNT(*)
FROM leave_requests

UNION ALL

SELECT 
  'Leaves with Valid Employee',
  COUNT(*)
FROM leave_requests lr
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = lr.employee_id)

UNION ALL

SELECT 
  'Total Payroll Transactions',
  COUNT(*)
FROM payroll_transactions

UNION ALL

SELECT 
  'Payroll with Valid Employee',
  COUNT(*)
FROM payroll_transactions pt
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.id = pt.employee_id);

-- 9. FINAL VALIDATION CHECK
-- ============================================================================

-- This should return 0 for all checks if migration is successful
SELECT 
  'VALIDATION_CHECK' as check_type,
  CASE 
    WHEN (
      -- No orphaned foreign keys
      (SELECT COUNT(*) FROM employees e 
       WHERE e.department_id IS NOT NULL 
         AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id)) = 0
      AND
      (SELECT COUNT(*) FROM attendance_records ar 
       WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = ar.employee_id)) = 0
      AND
      (SELECT COUNT(*) FROM leave_requests lr 
       WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = lr.employee_id)) = 0
      AND
      -- No duplicate employee numbers
      (SELECT COUNT(*) FROM (
        SELECT employee_number FROM employees 
        GROUP BY employee_number HAVING COUNT(*) > 1
      ) dup) = 0
      AND
      -- All employees have names
      (SELECT COUNT(*) FROM employees 
       WHERE first_name IS NULL OR last_name IS NULL) = 0
    )
    THEN '✅ ALL CHECKS PASSED'
    ELSE '❌ VALIDATION FAILED - CHECK INDIVIDUAL QUERIES ABOVE'
  END as result;
