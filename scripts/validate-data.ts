/**
 * Data Validation Script
 * Validates data integrity across the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  count?: number;
  message: string;
  details?: any[];
}

async function validateData(): Promise<ValidationResult[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const results: ValidationResult[] = [];

  console.log('🔍 Starting data validation...\n');

  // Check 1: Orphaned attendance records
  console.log('Checking for orphaned attendance records...');
  const { data: orphanedAttendance, error: orphanError } = await supabase.rpc('check_orphaned_attendance');
  
  if (!orphanError && orphanedAttendance) {
    results.push({
      check: 'Orphaned Attendance Records',
      status: orphanedAttendance.length === 0 ? 'PASS' : 'FAIL',
      count: orphanedAttendance.length,
      message: orphanedAttendance.length === 0 
        ? 'No orphaned attendance records found' 
        : `Found ${orphanedAttendance.length} orphaned attendance records`,
      details: orphanedAttendance.slice(0, 5),
    });
  }

  // Check 2: Negative salaries
  console.log('Checking for negative salaries...');
  const { data: negativeSalaries } = await supabase
    .from('payroll_transactions')
    .select('*')
    .lt('net_salary', 0);

  results.push({
    check: 'Negative Salaries',
    status: !negativeSalaries || negativeSalaries.length === 0 ? 'PASS' : 'FAIL',
    count: negativeSalaries?.length || 0,
    message: !negativeSalaries || negativeSalaries.length === 0
      ? 'No negative salaries found'
      : `Found ${negativeSalaries.length} negative salary records`,
    details: negativeSalaries?.slice(0, 5),
  });

  // Check 3: Missing required fields in employees
  console.log('Checking for missing required fields...');
  const { data: missingFields } = await supabase
    .from('employees')
    .select('id, employee_number, first_name, last_name, email, phone')
    .or('email.is.null,phone.is.null');

  results.push({
    check: 'Missing Required Fields',
    status: !missingFields || missingFields.length === 0 ? 'PASS' : 'WARNING',
    count: missingFields?.length || 0,
    message: !missingFields || missingFields.length === 0
      ? 'All employees have required fields'
      : `Found ${missingFields.length} employees with missing email or phone`,
    details: missingFields?.slice(0, 5),
  });

  // Check 4: Duplicate attendance records
  console.log('Checking for duplicate attendance records...');
  const { data: duplicates } = await supabase.rpc('check_duplicate_attendance');

  if (duplicates) {
    results.push({
      check: 'Duplicate Attendance Records',
      status: duplicates.length === 0 ? 'PASS' : 'FAIL',
      count: duplicates.length,
      message: duplicates.length === 0
        ? 'No duplicate attendance records found'
        : `Found ${duplicates.length} duplicate attendance records`,
      details: duplicates.slice(0, 5),
    });
  }

  // Check 5: Negative leave balances
  console.log('Checking for negative leave balances...');
  const { data: negativeBalances } = await supabase
    .from('leave_balances')
    .select('*')
    .lt('available_days', 0);

  results.push({
    check: 'Negative Leave Balances',
    status: !negativeBalances || negativeBalances.length === 0 ? 'PASS' : 'FAIL',
    count: negativeBalances?.length || 0,
    message: !negativeBalances || negativeBalances.length === 0
      ? 'No negative leave balances found'
      : `Found ${negativeBalances.length} negative leave balances`,
    details: negativeBalances?.slice(0, 5),
  });

  // Check 6: Future-dated attendance
  console.log('Checking for future-dated attendance...');
  const today = new Date().toISOString().split('T')[0];
  const { data: futureAttendance } = await supabase
    .from('attendance_records')
    .select('*')
    .gt('attendance_date', today);

  results.push({
    check: 'Future-Dated Attendance',
    status: !futureAttendance || futureAttendance.length === 0 ? 'PASS' : 'WARNING',
    count: futureAttendance?.length || 0,
    message: !futureAttendance || futureAttendance.length === 0
      ? 'No future-dated attendance records'
      : `Found ${futureAttendance.length} future-dated attendance records`,
    details: futureAttendance?.slice(0, 5),
  });

  // Check 7: Payroll transactions without employee
  console.log('Checking payroll transaction integrity...');
  const { data: orphanedPayroll } = await supabase.rpc('check_orphaned_payroll');

  if (orphanedPayroll) {
    results.push({
      check: 'Orphaned Payroll Transactions',
      status: orphanedPayroll.length === 0 ? 'PASS' : 'FAIL',
      count: orphanedPayroll.length,
      message: orphanedPayroll.length === 0
        ? 'All payroll transactions have valid employees'
        : `Found ${orphanedPayroll.length} orphaned payroll transactions`,
      details: orphanedPayroll.slice(0, 5),
    });
  }

  // Check 8: Leave requests with invalid dates
  console.log('Checking leave request dates...');
  const { data: invalidLeaves } = await supabase
    .from('leave_requests')
    .select('*')
    .filter('end_date', 'lt', 'start_date');

  results.push({
    check: 'Invalid Leave Request Dates',
    status: !invalidLeaves || invalidLeaves.length === 0 ? 'PASS' : 'FAIL',
    count: invalidLeaves?.length || 0,
    message: !invalidLeaves || invalidLeaves.length === 0
      ? 'All leave requests have valid dates'
      : `Found ${invalidLeaves.length} leave requests with end_date before start_date`,
    details: invalidLeaves?.slice(0, 5),
  });

  return results;
}

async function createValidationFunctions() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const functions = `
    -- Function to check orphaned attendance records
    CREATE OR REPLACE FUNCTION check_orphaned_attendance()
    RETURNS TABLE (
      id UUID,
      employee_id UUID,
      attendance_date DATE
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT a.id, a.employee_id, a.attendance_date
      FROM attendance_records a
      WHERE a.employee_id NOT IN (SELECT id FROM employees);
    END;
    $$ LANGUAGE plpgsql;

    -- Function to check duplicate attendance
    CREATE OR REPLACE FUNCTION check_duplicate_attendance()
    RETURNS TABLE (
      employee_id UUID,
      attendance_date DATE,
      count BIGINT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT a.employee_id, a.attendance_date, COUNT(*)
      FROM attendance_records a
      GROUP BY a.employee_id, a.attendance_date
      HAVING COUNT(*) > 1;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to check orphaned payroll
    CREATE OR REPLACE FUNCTION check_orphaned_payroll()
    RETURNS TABLE (
      id UUID,
      employee_id UUID,
      period_id UUID
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT p.id, p.employee_id, p.period_id
      FROM payroll_transactions p
      WHERE p.employee_id NOT IN (SELECT id FROM employees);
    END;
    $$ LANGUAGE plpgsql;
  `;

  console.log('Creating validation functions...');
  // Note: These functions should be created via migration
  console.log('Validation functions SQL ready');
}

async function printResults(results: ValidationResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   ${result.message}`);
    
    if (result.details && result.details.length > 0) {
      console.log(`   Sample records (showing ${result.details.length}):`);
      result.details.forEach((detail, idx) => {
        console.log(`   ${idx + 1}. ${JSON.stringify(detail).substring(0, 100)}...`);
      });
    }
    console.log('');

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warningCount++;
  });

  console.log('='.repeat(80));
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('❌ Validation FAILED - Please fix the issues above');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  Validation passed with warnings');
    process.exit(0);
  } else {
    console.log('✅ All validation checks PASSED');
    process.exit(0);
  }
}

// Main execution
async function main() {
  try {
    const results = await validateData();
    await printResults(results);
  } catch (error: any) {
    console.error('❌ Validation script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { validateData, ValidationResult };
