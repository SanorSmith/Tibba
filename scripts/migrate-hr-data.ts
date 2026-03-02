#!/usr/bin/env ts-node

/**
 * HR DATA MIGRATION SCRIPT
 * Migrates all HR data from JSON files to Supabase database
 * 
 * Usage: npm run migrate:hr
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 100;
const DATA_DIR = path.join(__dirname, '../src/data/hr');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
  table: string;
  jsonCount: number;
  inserted: number;
  failed: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

interface MigrationReport {
  success: boolean;
  totalRecords: number;
  totalInserted: number;
  totalFailed: number;
  stats: MigrationStats[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

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

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadJSON(filename: string): any {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filename}`, 'warn');
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function ensureDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

function ensureTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// BATCH INSERT HELPER
// ============================================================================

async function batchInsert(
  table: string,
  records: any[],
  stats: MigrationStats
): Promise<void> {
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  log(`Inserting ${records.length} records into ${table} in ${batches.length} batches`, 'info');

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const { data, error } = await supabase.from(table).insert(batch);
      
      if (error) {
        log(`Batch ${i + 1}/${batches.length} failed: ${error.message}`, 'error');
        stats.failed += batch.length;
        stats.errors.push(`Batch ${i + 1}: ${error.message}`);
      } else {
        stats.inserted += batch.length;
        log(`Batch ${i + 1}/${batches.length} completed (${batch.length} records)`, 'success');
      }
    } catch (err: any) {
      log(`Batch ${i + 1}/${batches.length} exception: ${err.message}`, 'error');
      stats.failed += batch.length;
      stats.errors.push(`Batch ${i + 1} exception: ${err.message}`);
    }
  }
}

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

function transformDepartment(dept: any, orgId: string): any {
  return {
    id: generateUUID(),
    organization_id: orgId,
    code: dept.code || dept.id,
    name: dept.name,
    name_ar: dept.name_arabic || dept.name_ar,
    type: dept.type || 'CLINICAL',
    parent_id: null, // Will be updated in second pass if needed
    head_employee_id: null, // Will be updated after employees are inserted
    location: dept.location,
    phone: dept.phone_ext,
    budget_code: dept.code,
    annual_budget: dept.budget_annual || 0,
    active: dept.is_active !== false,
    metadata: {
      original_id: dept.id,
    },
    created_at: ensureTimestamp(),
    updated_at: ensureTimestamp(),
  };
}

function transformEmployee(emp: any, orgId: string, deptIdMap: Map<string, string>): any {
  const deptId = deptIdMap.get(emp.department_id);
  
  return {
    id: generateUUID(),
    organization_id: orgId,
    department_id: deptId || null,
    employee_number: emp.employee_number || emp.id,
    national_id: emp.national_id,
    passport_number: emp.passport_number || null,
    first_name: emp.first_name,
    middle_name: emp.middle_name || null,
    last_name: emp.last_name,
    first_name_ar: emp.full_name_arabic?.split(' ')[0] || null,
    last_name_ar: emp.full_name_arabic?.split(' ').slice(-1)[0] || null,
    date_of_birth: ensureDate(emp.date_of_birth),
    gender: emp.gender,
    marital_status: emp.marital_status,
    nationality: emp.nationality || 'Iraqi',
    job_title: emp.job_title,
    job_title_ar: null,
    employment_type: emp.employment_type,
    employment_status: emp.employment_status || 'ACTIVE',
    hire_date: ensureDate(emp.date_of_hire),
    termination_date: null,
    probation_end_date: null,
    salary_grade: emp.salary_grade || emp.grade_id,
    base_salary: emp.basic_salary || 0,
    currency: 'IQD',
    email: emp.email_work || emp.email || null,
    phone: emp.phone_mobile || emp.phone || null,
    emergency_contact: emp.emergency_contact ? {
      name: emp.emergency_contact.name,
      relationship: emp.emergency_contact.relationship,
      phone: emp.emergency_contact.phone,
    } : null,
    address: emp.current_address || null,
    qualifications: emp.education || null,
    specialties: emp.licenses || null,
    license_number: emp.licenses?.[0]?.number || null,
    license_expiry: emp.licenses?.[0]?.expiry ? ensureDate(emp.licenses[0].expiry) : null,
    user_id: null,
    active: emp.employment_status === 'ACTIVE',
    metadata: {
      original_id: emp.id,
      blood_type: emp.blood_type,
      photo_url: emp.photo_url,
      shift_id: emp.shift_id,
      reporting_to: emp.reporting_to,
      employee_category: emp.employee_category,
    },
    created_at: ensureTimestamp(),
    updated_at: ensureTimestamp(),
  };
}

function transformAttendanceRecord(record: any, empIdMap: Map<string, string>, orgId: string): any {
  const empId = empIdMap.get(record.employee_id);
  if (!empId) return null;

  return {
    id: generateUUID(),
    organization_id: orgId,
    employee_id: empId,
    attendance_date: ensureDate(record.date),
    check_in: record.check_in ? new Date(record.check_in).toISOString() : null,
    check_out: record.check_out ? new Date(record.check_out).toISOString() : null,
    total_hours: record.total_hours || 0,
    overtime_hours: record.overtime_hours || 0,
    status: record.status || 'PRESENT',
    notes: record.notes || null,
    approved_by: null,
    approved_at: null,
    metadata: {
      original_id: record.id,
      shift_id: record.shift_id,
    },
    created_at: ensureTimestamp(),
    updated_at: ensureTimestamp(),
  };
}

function transformLeaveRequest(leave: any, empIdMap: Map<string, string>, orgId: string): any {
  const empId = empIdMap.get(leave.employee_id);
  if (!empId) return null;

  return {
    id: generateUUID(),
    organization_id: orgId,
    employee_id: empId,
    leave_type_id: null, // Will need to create leave types first
    start_date: ensureDate(leave.start_date),
    end_date: ensureDate(leave.end_date),
    total_days: leave.total_days || 1,
    reason: leave.reason || null,
    status: leave.status || 'PENDING',
    requested_at: leave.requested_at ? new Date(leave.requested_at).toISOString() : ensureTimestamp(),
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    metadata: {
      original_id: leave.id,
      leave_type: leave.leave_type,
    },
    created_at: ensureTimestamp(),
    updated_at: ensureTimestamp(),
  };
}

function transformPayrollTransaction(payroll: any, empIdMap: Map<string, string>): any {
  const empId = empIdMap.get(payroll.employee_id);
  if (!empId) return null;

  return {
    id: generateUUID(),
    period_id: null, // Will need to create payroll periods first
    employee_id: empId,
    basic_salary: payroll.basic_salary || 0,
    allowances: payroll.allowances || 0,
    deductions: payroll.deductions || 0,
    overtime_pay: payroll.overtime_pay || 0,
    bonus: payroll.bonus || 0,
    gross_salary: payroll.gross_salary || 0,
    net_salary: payroll.net_salary || 0,
    currency: 'IQD',
    payment_date: ensureDate(payroll.payment_date),
    payment_method: payroll.payment_method || 'BANK_TRANSFER',
    payment_reference: payroll.payment_reference || null,
    status: payroll.status || 'PENDING',
    notes: payroll.notes || null,
    metadata: {
      original_id: payroll.id,
      period: payroll.period,
    },
    created_at: ensureTimestamp(),
    updated_at: ensureTimestamp(),
  };
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function getOrganizationId(): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    log('No organization found, creating default organization', 'warn');
    const newOrg = {
      id: generateUUID(),
      code: 'TIBBNA',
      name: 'Tibbna Hospital',
      name_ar: 'مستشفى طبنة',
      type: 'HOSPITAL',
      active: true,
      created_at: ensureTimestamp(),
      updated_at: ensureTimestamp(),
    };
    
    const { data: created, error: createError } = await supabase
      .from('organizations')
      .insert(newOrg)
      .select()
      .single();
    
    if (createError) {
      throw new Error(`Failed to create organization: ${createError.message}`);
    }
    
    return created.id;
  }

  return data.id;
}

async function migrateDepartments(orgId: string): Promise<{ stats: MigrationStats; idMap: Map<string, string> }> {
  const stats: MigrationStats = {
    table: 'departments',
    jsonCount: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  log('📁 Migrating Departments...', 'info');

  const jsonData = loadJSON('departments.json');
  if (!jsonData?.departments) {
    log('No departments data found', 'warn');
    stats.endTime = new Date();
    return { stats, idMap: new Map() };
  }

  const departments = jsonData.departments;
  stats.jsonCount = departments.length;

  const idMap = new Map<string, string>();
  const transformed = departments.map((dept: any) => {
    const newDept = transformDepartment(dept, orgId);
    idMap.set(dept.id, newDept.id);
    return newDept;
  });

  await batchInsert('departments', transformed, stats);

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  return { stats, idMap };
}

async function migrateEmployees(orgId: string, deptIdMap: Map<string, string>): Promise<{ stats: MigrationStats; idMap: Map<string, string> }> {
  const stats: MigrationStats = {
    table: 'employees',
    jsonCount: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  log('👥 Migrating Employees...', 'info');

  const jsonData = loadJSON('employees.json');
  if (!jsonData?.employees) {
    log('No employees data found', 'warn');
    stats.endTime = new Date();
    return { stats, idMap: new Map() };
  }

  const employees = jsonData.employees;
  stats.jsonCount = employees.length;

  const idMap = new Map<string, string>();
  const transformed = employees.map((emp: any) => {
    const newEmp = transformEmployee(emp, orgId, deptIdMap);
    idMap.set(emp.id, newEmp.id);
    return newEmp;
  });

  await batchInsert('employees', transformed, stats);

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  return { stats, idMap };
}

async function migrateAttendance(orgId: string, empIdMap: Map<string, string>): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: 'attendance_records',
    jsonCount: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  log('📅 Migrating Attendance Records...', 'info');

  const jsonData = loadJSON('attendance.json');
  if (!jsonData?.daily_summaries) {
    log('No attendance data found', 'warn');
    stats.endTime = new Date();
    return stats;
  }

  const records = jsonData.daily_summaries;
  stats.jsonCount = records.length;

  const transformed = records
    .map((record: any) => transformAttendanceRecord(record, empIdMap, orgId))
    .filter((r: any) => r !== null);

  if (transformed.length < records.length) {
    log(`Skipped ${records.length - transformed.length} records due to missing employee references`, 'warn');
  }

  await batchInsert('attendance_records', transformed, stats);

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  return stats;
}

async function migrateLeaves(orgId: string, empIdMap: Map<string, string>): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: 'leave_requests',
    jsonCount: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  log('🏖️ Migrating Leave Requests...', 'info');

  const jsonData = loadJSON('leaves.json');
  if (!jsonData?.leave_requests) {
    log('No leave requests data found', 'warn');
    stats.endTime = new Date();
    return stats;
  }

  const leaves = jsonData.leave_requests;
  stats.jsonCount = leaves.length;

  const transformed = leaves
    .map((leave: any) => transformLeaveRequest(leave, empIdMap, orgId))
    .filter((l: any) => l !== null);

  if (transformed.length < leaves.length) {
    log(`Skipped ${leaves.length - transformed.length} records due to missing employee references`, 'warn');
  }

  await batchInsert('leave_requests', transformed, stats);

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  return stats;
}

async function migratePayroll(empIdMap: Map<string, string>): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: 'payroll_transactions',
    jsonCount: 0,
    inserted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  log('💰 Migrating Payroll Transactions...', 'info');

  const jsonData = loadJSON('payroll.json');
  if (!jsonData?.payroll_periods) {
    log('No payroll data found', 'warn');
    stats.endTime = new Date();
    return stats;
  }

  // Extract transactions from payroll periods
  const transactions: any[] = [];
  jsonData.payroll_periods.forEach((period: any) => {
    if (period.transactions) {
      transactions.push(...period.transactions);
    }
  });

  stats.jsonCount = transactions.length;

  const transformed = transactions
    .map((txn: any) => transformPayrollTransaction(txn, empIdMap))
    .filter((t: any) => t !== null);

  if (transformed.length < transactions.length) {
    log(`Skipped ${transactions.length - transformed.length} records due to missing employee references`, 'warn');
  }

  await batchInsert('payroll_transactions', transformed, stats);

  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  return stats;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

async function validateMigration(report: MigrationReport): Promise<void> {
  log('\n🔍 Validating Migration...', 'info');

  // Check row counts
  for (const stat of report.stats) {
    const { count, error } = await supabase
      .from(stat.table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      log(`Failed to count ${stat.table}: ${error.message}`, 'error');
      continue;
    }

    log(`${stat.table}: JSON=${stat.jsonCount}, Inserted=${stat.inserted}, DB=${count}`, 'info');
    
    if (count !== stat.inserted) {
      log(`⚠️  Mismatch in ${stat.table}: expected ${stat.inserted}, found ${count}`, 'warn');
    }
  }

  // Check for orphaned foreign keys
  log('\n🔗 Checking Foreign Key Integrity...', 'info');

  const { data: orphanedEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, employee_number, department_id')
    .not('department_id', 'is', null)
    .not('department_id', 'in', `(SELECT id FROM departments)`);

  if (!empError && orphanedEmployees && orphanedEmployees.length > 0) {
    log(`Found ${orphanedEmployees.length} employees with invalid department references`, 'warn');
  } else {
    log('✅ No orphaned employee-department references', 'success');
  }

  log('\n✅ Validation Complete', 'success');
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 HR DATA MIGRATION REPORT');
  console.log('='.repeat(80));
  console.log(`\nStart Time: ${report.startTime.toISOString()}`);
  console.log(`End Time: ${report.endTime.toISOString()}`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
  console.log(`\nOverall Status: ${report.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Total Records: ${report.totalRecords}`);
  console.log(`Total Inserted: ${report.totalInserted}`);
  console.log(`Total Failed: ${report.totalFailed}`);

  console.log('\n' + '-'.repeat(80));
  console.log('Detailed Statistics:');
  console.log('-'.repeat(80));

  for (const stat of report.stats) {
    console.log(`\n📋 ${stat.table.toUpperCase()}`);
    console.log(`   JSON Records: ${stat.jsonCount}`);
    console.log(`   Inserted: ${stat.inserted}`);
    console.log(`   Failed: ${stat.failed}`);
    console.log(`   Duration: ${stat.duration ? (stat.duration / 1000).toFixed(2) + 's' : 'N/A'}`);
    
    if (stat.errors.length > 0) {
      console.log(`   Errors:`);
      stat.errors.slice(0, 5).forEach(err => console.log(`     - ${err}`));
      if (stat.errors.length > 5) {
        console.log(`     ... and ${stat.errors.length - 5} more errors`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  // Save report to file
  const reportPath = path.join(__dirname, '../migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Full report saved to: ${reportPath}`, 'info');
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🏥 TIBBNA HOSPITAL - HR DATA MIGRATION');
  console.log('='.repeat(80) + '\n');

  const report: MigrationReport = {
    success: false,
    totalRecords: 0,
    totalInserted: 0,
    totalFailed: 0,
    stats: [],
    startTime: new Date(),
    endTime: new Date(),
    duration: 0,
  };

  try {
    // Get or create organization
    const orgId = await getOrganizationId();
    log(`Using organization ID: ${orgId}`, 'info');

    // Migrate in order to respect foreign key constraints
    const { stats: deptStats, idMap: deptIdMap } = await migrateDepartments(orgId);
    report.stats.push(deptStats);

    const { stats: empStats, idMap: empIdMap } = await migrateEmployees(orgId, deptIdMap);
    report.stats.push(empStats);

    const attStats = await migrateAttendance(orgId, empIdMap);
    report.stats.push(attStats);

    const leaveStats = await migrateLeaves(orgId, empIdMap);
    report.stats.push(leaveStats);

    const payrollStats = await migratePayroll(empIdMap);
    report.stats.push(payrollStats);

    // Calculate totals
    report.totalRecords = report.stats.reduce((sum, s) => sum + s.jsonCount, 0);
    report.totalInserted = report.stats.reduce((sum, s) => sum + s.inserted, 0);
    report.totalFailed = report.stats.reduce((sum, s) => sum + s.failed, 0);
    report.success = report.totalFailed === 0;

    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    // Validate migration
    await validateMigration(report);

    // Generate report
    generateReport(report);

    if (report.success) {
      log('\n🎉 Migration completed successfully!', 'success');
      process.exit(0);
    } else {
      log('\n⚠️  Migration completed with errors. Check the report for details.', 'warn');
      process.exit(1);
    }

  } catch (error: any) {
    log(`\n💥 Migration failed: ${error.message}`, 'error');
    console.error(error);
    
    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();
    generateReport(report);
    
    process.exit(1);
  }
}

// Run migration
main();
