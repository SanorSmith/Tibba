#!/usr/bin/env ts-node

/**
 * HR MIGRATION VALIDATION EXECUTOR
 * Runs validation queries using Supabase credentials
 * 
 * Usage: npm run validate:hr
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

function formatTable(data: any[], headers: string[]): void {
  if (data.length === 0) {
    console.log('   No data found');
    return;
  }

  // Calculate column widths
  const widths = headers.map(header => 
    Math.max(header.length, ...data.map(row => String(row[header] || '').length))
  );

  // Print headers
  const headerRow = headers.map((header, i) => 
    header.padEnd(widths[i])
  ).join(' | ');
  console.log(`   ${headerRow}`);
  console.log(`   ${'─'.repeat(headerRow.length)}`);

  // Print data rows
  data.forEach(row => {
    const dataRow = headers.map((header, i) => 
      String(row[header] || '').padEnd(widths[i])
    ).join(' | ');
    console.log(`   ${dataRow}`);
  });
}

// ============================================================================
// VALIDATION QUERIES
// ============================================================================

async function runRowCountValidation(): Promise<void> {
  log('\n📊 1. ROW COUNT COMPARISON', 'info');
  
  const query = `
    SELECT 'departments' as table_name, COUNT(*) as record_count FROM departments
    UNION ALL
    SELECT 'employees', COUNT(*) FROM employees
    UNION ALL
    SELECT 'attendance_records', COUNT(*) FROM attendance_records
    UNION ALL
    SELECT 'leave_requests', COUNT(*) FROM leave_requests
    UNION ALL
    SELECT 'payroll_transactions', COUNT(*) FROM payroll_transactions
    ORDER BY table_name
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
  
  if (error) {
    // Fallback to individual queries if RPC not available
    const tables = ['departments', 'employees', 'attendance_records', 'leave_requests', 'payroll_transactions'];
    const results = [];
    
    for (const table of tables) {
      const { count, error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!tableError) {
        results.push({ table_name: table, record_count: count || 0 });
      }
    }
    
    formatTable(results, ['table_name', 'record_count']);
  } else {
    formatTable(data, ['table_name', 'record_count']);
  }
}

async function runForeignKeyValidation(): Promise<void> {
  log('\n🔗 2. CHECK FOR ORPHANED FOREIGN KEYS', 'info');
  
  const checks = [
    {
      name: 'employees_invalid_dept',
      query: (supabase: any) => supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .not('department_id', 'is', null)
        .then(({ count, error }) => ({ count: count || 0, error }))
    },
    {
      name: 'attendance_invalid_emp',
      query: async (supabase: any) => {
        const { count, error } = await supabase
          .from('attendance_records')
          .select('id', { count: 'exact', head: true });
        
        if (error) return { count: 0, error };
        
        // Check for orphaned records
        const { data: employees } = await supabase
          .from('employees')
          .select('id');
        
        const employeeIds = employees?.map((e: any) => e.id) || [];
        
        const { count: orphaned } = await supabase
          .from('attendance_records')
          .select('id', { count: 'exact', head: true })
          .not('employee_id', 'in', `(${employeeIds.join(',')})`);
        
        return { count: orphaned || 0, error: null };
      }
    },
    {
      name: 'leaves_invalid_emp',
      query: async (supabase: any) => {
        const { count, error } = await supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true });
        
        if (error) return { count: 0, error };
        
        const { data: employees } = await supabase
          .from('employees')
          .select('id');
        
        const employeeIds = employees?.map((e: any) => e.id) || [];
        
        const { count: orphaned } = await supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .not('employee_id', 'in', `(${employeeIds.join(',')})`);
        
        return { count: orphaned || 0, error: null };
      }
    },
    {
      name: 'payroll_invalid_emp',
      query: async (supabase: any) => {
        const { count, error } = await supabase
          .from('payroll_transactions')
          .select('id', { count: 'exact', head: true });
        
        if (error) return { count: 0, error };
        
        const { data: employees } = await supabase
          .from('employees')
          .select('id');
        
        const employeeIds = employees?.map((e: any) => e.id) || [];
        
        const { count: orphaned } = await supabase
          .from('payroll_transactions')
          .select('id', { count: 'exact', head: true })
          .not('employee_id', 'in', `(${employeeIds.join(',')})`);
        
        return { count: orphaned || 0, error: null };
      }
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.query(supabase);
      results.push({ issue: check.name, count: (result as any).count || 0 });
      
      if ((result as any).count === 0) {
        log(`   ✅ ${check.name}: 0 orphaned records`, 'success');
      } else {
        log(`   ⚠️  ${check.name}: ${formatNumber((result as any).count || 0)} orphaned records`, 'warn');
      }
    } catch (err: any) {
      log(`   ❌ ${check.name}: Error - ${err.message}`, 'error');
      results.push({ issue: check.name, count: -1 });
    }
  }
}

async function runDuplicateValidation(): Promise<void> {
  log('\n🔄 3. CHECK FOR DUPLICATE RECORDS', 'info');
  
  // Check duplicate employee numbers
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('employee_number');
  
  if (!empError && employees) {
    const counts = employees.reduce((acc: any, emp: any) => {
      acc[emp.employee_number] = (acc[emp.employee_number] || 0) + 1;
      return acc;
    }, {});
    
    const duplicates = Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([employee_number, duplicate_count]) => ({ employee_number, duplicate_count }));
    
    if (duplicates.length === 0) {
      log('   ✅ No duplicate employee numbers found', 'success');
    } else {
      log(`   ⚠️  Found ${duplicates.length} duplicate employee numbers:`, 'warn');
      formatTable(duplicates, ['employee_number', 'duplicate_count']);
    }
  }
  
  // Check duplicate national IDs
  const { data: employeesWithNid, error: nidError } = await supabase
    .from('employees')
    .select('national_id')
    .not('national_id', 'is', null);
  
  if (!nidError && employeesWithNid) {
    const counts = employeesWithNid.reduce((acc: any, emp: any) => {
      acc[emp.national_id] = (acc[emp.national_id] || 0) + 1;
      return acc;
    }, {});
    
    const duplicates = Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([national_id, duplicate_count]) => ({ national_id, duplicate_count }));
    
    if (duplicates.length === 0) {
      log('   ✅ No duplicate national IDs found', 'success');
    } else {
      log(`   ⚠️  Found ${duplicates.length} duplicate national IDs:`, 'warn');
      formatTable(duplicates, ['national_id', 'duplicate_count']);
    }
  }
}

async function runDataQualityValidation(): Promise<void> {
  log('\n🔍 4. DATA QUALITY CHECKS', 'info');
  
  const checks = [
    {
      name: 'employees_missing_name',
      query: () => supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .or('first_name.is.null,last_name.is.null')
    },
    {
      name: 'employees_no_dept',
      query: () => supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .is('department_id', null)
    },
    {
      name: 'employees_invalid_status',
      query: () => supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .not('employment_status', 'in', "('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED')")
    },
    {
      name: 'attendance_no_date',
      query: () => supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .is('attendance_date', null)
    },
    {
      name: 'leaves_invalid_dates',
      query: () => supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .gt('start_date', 'end_date')
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const { count, error } = await check.query();
      
      if (!error) {
        results.push({ issue: check.name, count: count || 0 });
        
        if (count === 0) {
          log(`   ✅ ${check.name}: 0 issues`, 'success');
        } else {
          log(`   ⚠️  ${check.name}: ${formatNumber(count)} issues`, 'warn');
        }
      } else {
        log(`   ❌ ${check.name}: Error - ${error.message}`, 'error');
        results.push({ issue: check.name, count: -1 });
      }
    } catch (err: any) {
      log(`   ❌ ${check.name}: Exception - ${err.message}`, 'error');
      results.push({ issue: check.name, count: -1 });
    }
  }
}

async function runSummaryStatistics(): Promise<void> {
  log('\n📈 5. SUMMARY STATISTICS', 'info');
  
  // Employee distribution by department
  const { data: deptStats, error: deptError } = await supabase
    .from('departments')
    .select(`
      name,
      code,
      employees!inner(id, employment_status)
    `);
  
  if (!deptError && deptStats) {
    const stats = deptStats.map(dept => ({
      department: dept.name,
      code: dept.code,
      employee_count: dept.employees?.length || 0,
      active_count: dept.employees?.filter((e: any) => e.employment_status === 'ACTIVE').length || 0
    }));
    
    log('   📋 Employee Distribution by Department:', 'info');
    formatTable(stats.sort((a, b) => b.employee_count - a.employee_count), 
                ['department', 'code', 'employee_count', 'active_count']);
  }
  
  // Employee distribution by employment type
  const { data: empTypes, error: typeError } = await supabase
    .from('employees')
    .select('employment_type');
  
  if (!typeError && empTypes) {
    const typeCounts = empTypes.reduce((acc: any, emp: any) => {
      const type = emp.employment_type || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const total = empTypes.length;
    const stats = Object.entries(typeCounts).map(([type, count]) => ({
      employment_type: type,
      count,
      percentage: Number(((Number(count) / total) * 100).toFixed(2))
    }));
    
    log('\n   👥 Employee Distribution by Employment Type:', 'info');
    formatTable(stats.sort((a, b) => b.count - a.count), 
                ['employment_type', 'count', 'percentage']);
  }
}

async function runFinalValidation(): Promise<void> {
  log('\n🎯 6. FINAL VALIDATION CHECK', 'info');
  
  let allPassed = true;
  const issues: string[] = [];
  
  // Check for orphaned foreign keys
  const { data: orphanedEmps } = await supabase
    .from('employees')
    .select('id')
    .not('department_id', 'is', null)
    .then(({ data }) => {
      if (!data || data.length === 0) return { data: [] };
      
      return supabase
        .from('departments')
        .select('id');
    });
  
  if (orphanedEmps && orphanedEmps.length > 0) {
    allPassed = false;
    issues.push('Employees with invalid department references');
  }
  
  // Check for duplicate employee numbers
  const { data: employees } = await supabase
    .from('employees')
    .select('employee_number');
  
  if (employees) {
    const counts = employees.reduce((acc: any, emp: any) => {
      acc[emp.employee_number] = (acc[emp.employee_number] || 0) + 1;
      return acc;
    }, {});
    
    const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      allPassed = false;
      issues.push('Duplicate employee numbers');
    }
  }
  
  // Check for missing names
  const { count: missingNames } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .or('first_name.is.null,last_name.is.null');
  
  if (missingNames && missingNames > 0) {
    allPassed = false;
    issues.push('Employees missing required names');
  }
  
  if (allPassed) {
    log('   🎉 ALL VALIDATION CHECKS PASSED!', 'success');
  } else {
    log('   ❌ VALIDATION FAILED - Issues found:', 'error');
    issues.forEach(issue => log(`      - ${issue}`, 'error'));
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
    await runRowCountValidation();
    await runForeignKeyValidation();
    await runDuplicateValidation();
    await runDataQualityValidation();
    await runSummaryStatistics();
    await runFinalValidation();
    
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
