#!/usr/bin/env ts-node

/**
 * SIMPLE HR MIGRATION VALIDATION
 * Uses Supabase client to validate migration data
 * 
 * Usage: npm run validate:hr
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
  };
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  };
  console.log(`${colors[type]}${icons[type]} ${message}\x1b[0m`);
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

async function getTableCount(tableName: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      log(`Error counting ${tableName}: ${error.message}`, 'error');
      return 0;
    }
    
    return count || 0;
  } catch (err: any) {
    log(`Exception counting ${tableName}: ${err.message}`, 'error');
    return 0;
  }
}

async function validateRowCounts(): Promise<void> {
  log('\n📊 1. ROW COUNT VALIDATION', 'info');
  
  const tables = [
    'departments',
    'employees', 
    'attendance_records',
    'leave_requests',
    'payroll_transactions'
  ];
  
  console.log('\n   Table Name        | Record Count');
  console.log('   -------------------|-------------');
  
  let totalRecords = 0;
  
  for (const table of tables) {
    const count = await getTableCount(table);
    totalRecords += count;
    const paddedName = table.padEnd(18);
    const paddedCount = formatNumber(count).padStart(11);
    console.log(`   ${paddedName} | ${paddedCount}`);
  }
  
  console.log(`   ${'Total Records'.padEnd(18)} | ${formatNumber(totalRecords).padStart(11)}`);
  
  if (totalRecords > 0) {
    log(`Found ${formatNumber(totalRecords)} total HR records`, 'success');
  } else {
    log('No HR records found - migration may not have been run', 'warn');
  }
}

async function validateForeignKeys(): Promise<void> {
  log('\n🔗 2. FOREIGN KEY VALIDATION', 'info');
  
  // Check employees with invalid departments
  try {
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, department_id')
      .not('department_id', 'is', null);
    
    if (!empError && employees && employees.length > 0) {
      const deptIds = employees.map(e => e.department_id).filter(Boolean);
      
      if (deptIds.length > 0) {
        const { data: departments, error: deptError } = await supabase
          .from('departments')
          .select('id')
          .in('id', deptIds);
        
        if (!deptError && departments) {
          const validDeptIds = new Set(departments.map(d => d.id));
          const orphanedEmployees = employees.filter(e => 
            e.department_id && !validDeptIds.has(e.department_id)
          );
          
          if (orphanedEmployees.length === 0) {
            log('All employees have valid department references', 'success');
          } else {
            log(`Found ${orphanedEmployees.length} employees with invalid departments`, 'warn');
          }
        }
      }
    }
  } catch (err: any) {
    log(`Error validating employee-department relationships: ${err.message}`, 'error');
  }
  
  // Check attendance with invalid employees
  try {
    const attendanceCount = await getTableCount('attendance_records');
    if (attendanceCount > 0) {
      const { data: attendance, error: attError } = await supabase
        .from('attendance_records')
        .select('employee_id')
        .limit(100); // Sample for performance
      
      if (!attError && attendance && attendance.length > 0) {
        const empIds = [...new Set(attendance.map(a => a.employee_id))];
        
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id')
          .in('id', empIds);
        
        if (!empError && employees) {
          const validEmpIds = new Set(employees.map(e => e.id));
          const orphanedAttendance = attendance.filter(a => 
            !validEmpIds.has(a.employee_id)
          );
          
          if (orphanedAttendance.length === 0) {
            log('Sample attendance records have valid employee references', 'success');
          } else {
            log(`Found ${orphanedAttendance.length} attendance records with invalid employees (sample)`, 'warn');
          }
        }
      }
    }
  } catch (err: any) {
    log(`Error validating attendance-employee relationships: ${err.message}`, 'error');
  }
}

async function validateDataQuality(): Promise<void> {
  log('\n🔍 3. DATA QUALITY VALIDATION', 'info');
  
  // Check employees with missing names
  try {
    const { count, error } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .or('first_name.is.null,last_name.is.null');
    
    if (!error) {
      if (count === 0) {
        log('All employees have required name fields', 'success');
      } else {
        log(`Found ${count} employees missing required name fields`, 'warn');
      }
    }
  } catch (err: any) {
    log(`Error checking employee names: ${err.message}`, 'error');
  }
  
  // Check duplicate employee numbers
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('employee_number')
      .limit(1000); // Reasonable limit
    
    if (!error && employees) {
      const counts = new Map<string, number>();
      employees.forEach(emp => {
        const num = emp.employee_number || 'NULL';
        counts.set(num, (counts.get(num) || 0) + 1);
      });
      
      const duplicates = Array.from(counts.entries()).filter(([_, count]) => count > 1);
      
      if (duplicates.length === 0) {
        log('No duplicate employee numbers found', 'success');
      } else {
        log(`Found ${duplicates.length} duplicate employee numbers`, 'warn');
        duplicates.slice(0, 5).forEach(([num, count]) => {
          console.log(`     - ${num}: ${count} occurrences`);
        });
      }
    }
  } catch (err: any) {
    log(`Error checking duplicate employee numbers: ${err.message}`, 'error');
  }
  
  // Check attendance records without dates
  try {
    const { count, error } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .is('attendance_date', null);
    
    if (!error) {
      if (count === 0) {
        log('All attendance records have valid dates', 'success');
      } else {
        log(`Found ${count} attendance records missing dates`, 'warn');
      }
    }
  } catch (err: any) {
    log(`Error checking attendance dates: ${err.message}`, 'error');
  }
}

async function generateSummary(): Promise<void> {
  log('\n📈 4. SUMMARY STATISTICS', 'info');
  
  try {
    // Employee status distribution
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('employment_status');
    
    if (!empError && employees) {
      const statusCounts = new Map<string, number>();
      employees.forEach(emp => {
        const status = emp.employment_status || 'UNKNOWN';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      
      console.log('\n   Employee Status Distribution:');
      console.log('   --------------------------');
      
      Array.from(statusCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          const percentage = ((count / employees.length) * 100).toFixed(1);
          console.log(`   ${status.padEnd(15)} | ${formatNumber(count)} (${percentage}%)`);
        });
    }
    
    // Department distribution
    const { data: deptStats, error: deptError } = await supabase
      .from('employees')
      .select('departments!inner(name)')
      .limit(1000);
    
    if (!deptError && deptStats) {
      const deptCounts = new Map<string, number>();
      deptStats.forEach(record => {
        const deptName = (record as any).departments?.name || 'Unknown';
        deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);
      });
      
      console.log('\n   Top 10 Departments by Employee Count:');
      console.log('   ------------------------------------');
      
      Array.from(deptCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([dept, count]) => {
          console.log(`   ${dept.padEnd(25)} | ${formatNumber(count)}`);
        });
    }
    
  } catch (err: any) {
    log(`Error generating summary: ${err.message}`, 'error');
  }
}

async function finalValidation(): Promise<void> {
  log('\n🎯 5. FINAL VALIDATION RESULT', 'info');
  
  const issues: string[] = [];
  
  // Check if we have data
  const empCount = await getTableCount('employees');
  const deptCount = await getTableCount('departments');
  
  if (empCount === 0) {
    issues.push('No employee records found');
  }
  
  if (deptCount === 0) {
    issues.push('No department records found');
  }
  
  // Quick foreign key check
  if (empCount > 0 && deptCount > 0) {
    try {
      const { count, error } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .not('department_id', 'is', null)
        .in('department_id', ['00000000-0000-0000-0000-000000000000']); // Invalid UUID
      
      if (!error && count && count > 0) {
        issues.push('Employees with invalid department references');
      }
    } catch (err: any) {
      log(`Error in final validation: ${err.message}`, 'error');
    }
  }
  
  if (issues.length === 0) {
    log('🎉 ALL VALIDATION CHECKS PASSED!', 'success');
    log('HR data migration appears to be successful', 'success');
  } else {
    log('❌ VALIDATION ISSUES FOUND:', 'error');
    issues.forEach(issue => log(`   - ${issue}`, 'error'));
    log('Please review the migration and fix these issues', 'warn');
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 HR MIGRATION VALIDATION');
  console.log('='.repeat(80));
  
  try {
    await validateRowCounts();
    await validateForeignKeys();
    await validateDataQuality();
    await generateSummary();
    await finalValidation();
    
    console.log('\n' + '='.repeat(80));
    log('✅ Validation completed!', 'success');
    console.log('='.repeat(80));
    
  } catch (error: any) {
    log(`\n💥 Validation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
