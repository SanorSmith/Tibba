/**
 * Report Generator Service
 * Generates HR reports with Excel and PDF export capabilities
 */

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Report cache (in-memory, 5 minutes TTL)
const reportCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type ReportType =
  | 'daily-attendance'
  | 'monthly-payroll'
  | 'leave-balance'
  | 'overtime-analysis'
  | 'department-headcount'
  | 'absence-report'
  | 'late-arrivals'
  | 'employee-directory'
  | 'license-expiry'
  | 'payroll-cost';

export interface ReportParameters {
  start_date?: string;
  end_date?: string;
  department_id?: string;
  employee_id?: string;
  month?: string;
  year?: number;
}

export interface ReportData {
  title: string;
  generated_at: string;
  parameters: ReportParameters;
  data: any[];
  summary?: any;
}

export class ReportGenerator {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate cache key from report type and parameters
   */
  private getCacheKey(reportType: ReportType, parameters: ReportParameters): string {
    const paramStr = JSON.stringify(parameters);
    return `${reportType}:${crypto.createHash('md5').update(paramStr).digest('hex')}`;
  }

  /**
   * Get cached report if available and not expired
   */
  private getCachedReport(cacheKey: string): any | null {
    const cached = reportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache report data
   */
  private cacheReport(cacheKey: string, data: any): void {
    reportCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cached reports
   */
  public clearCache(): void {
    reportCache.clear();
  }

  /**
   * Main report generation method
   */
  async generateReport(reportType: ReportType, parameters: ReportParameters = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey(reportType, parameters);
    const cached = this.getCachedReport(cacheKey);
    
    if (cached) {
      return cached;
    }

    let reportData: ReportData;

    switch (reportType) {
      case 'daily-attendance':
        reportData = await this.generateDailyAttendance(parameters);
        break;
      case 'monthly-payroll':
        reportData = await this.generateMonthlyPayroll(parameters);
        break;
      case 'leave-balance':
        reportData = await this.generateLeaveBalance(parameters);
        break;
      case 'overtime-analysis':
        reportData = await this.generateOvertimeAnalysis(parameters);
        break;
      case 'department-headcount':
        reportData = await this.generateDepartmentHeadcount(parameters);
        break;
      case 'absence-report':
        reportData = await this.generateAbsenceReport(parameters);
        break;
      case 'late-arrivals':
        reportData = await this.generateLateArrivals(parameters);
        break;
      case 'employee-directory':
        reportData = await this.generateEmployeeDirectory(parameters);
        break;
      case 'license-expiry':
        reportData = await this.generateLicenseExpiry(parameters);
        break;
      case 'payroll-cost':
        reportData = await this.generatePayrollCost(parameters);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    this.cacheReport(cacheKey, reportData);
    return reportData;
  }

  /**
   * 1. Daily Attendance Summary Report
   */
  private async generateDailyAttendance(params: ReportParameters): Promise<ReportData> {
    const date = params.start_date || new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('attendance_records')
      .select(`
        *,
        employees(employee_number, first_name, last_name, departments(name))
      `)
      .eq('attendance_date', date)
      .order('check_in');

    if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);

    const summary = {
      total_employees: data.length,
      present: data.filter((a: any) => a.status === 'PRESENT').length,
      absent: data.filter((a: any) => a.status === 'ABSENT').length,
      late: data.filter((a: any) => a.status === 'LATE').length,
      total_hours: data.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0),
      total_overtime: data.reduce((sum: number, a: any) => sum + (a.overtime_hours || 0), 0),
    };

    return {
      title: `Daily Attendance Summary - ${date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: data.map((a: any) => ({
        employee_number: a.employees?.employee_number,
        employee_name: `${a.employees?.first_name} ${a.employees?.last_name}`,
        department: a.employees?.departments?.name,
        check_in: a.check_in,
        check_out: a.check_out,
        total_hours: a.total_hours,
        overtime_hours: a.overtime_hours,
        status: a.status,
        shift_type: a.shift_type,
        is_hazard_shift: a.is_hazard_shift,
      })),
      summary,
    };
  }

  /**
   * 2. Monthly Payroll Report
   */
  private async generateMonthlyPayroll(params: ReportParameters): Promise<ReportData> {
    const { start_date, end_date } = params;

    const { data, error } = await this.supabase
      .from('payroll_transactions')
      .select(`
        *,
        employees(employee_number, first_name, last_name, departments(name))
      `)
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .order('created_at');

    if (error) throw new Error(`Failed to fetch payroll: ${error.message}`);

    const summary = {
      total_employees: data.length,
      total_gross: data.reduce((sum: number, p: any) => sum + (p.gross_salary || 0), 0),
      total_deductions: data.reduce((sum: number, p: any) => sum + (p.deductions || 0), 0),
      total_net: data.reduce((sum: number, p: any) => sum + (p.net_salary || 0), 0),
    };

    return {
      title: `Monthly Payroll Report - ${start_date} to ${end_date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: data.map((p: any) => ({
        employee_number: p.employees?.employee_number,
        employee_name: `${p.employees?.first_name} ${p.employees?.last_name}`,
        department: p.employees?.departments?.name,
        basic_salary: p.basic_salary,
        allowances: p.allowances,
        overtime_pay: p.overtime_pay,
        bonus: p.bonus,
        gross_salary: p.gross_salary,
        deductions: p.deductions,
        net_salary: p.net_salary,
        payment_status: p.status,
      })),
      summary,
    };
  }

  /**
   * 3. Leave Balance Report
   */
  private async generateLeaveBalance(params: ReportParameters): Promise<ReportData> {
    const { data: employees, error } = await this.supabase
      .from('employees')
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        departments(name),
        metadata
      `)
      .eq('status', 'active')
      .order('employee_number');

    if (error) throw new Error(`Failed to fetch employees: ${error.message}`);

    // Fetch leave requests for each employee
    const leaveData = await Promise.all(
      employees.map(async (emp: any) => {
        const { data: leaves } = await this.supabase
          .from('leave_requests')
          .select('leave_type, total_days, status')
          .eq('employee_id', emp.id)
          .eq('status', 'APPROVED');

        const usedLeave = {
          annual: 0,
          sick: 0,
          emergency: 0,
          unpaid: 0,
        };

        leaves?.forEach((leave: any) => {
          const type = leave.leave_type?.toLowerCase() || 'unpaid';
          if (type in usedLeave) {
            usedLeave[type as keyof typeof usedLeave] += leave.total_days || 0;
          }
        });

        const annualEntitlement = emp.metadata?.annual_leave_days || 30;
        const sickEntitlement = emp.metadata?.sick_leave_days || 15;

        return {
          employee_number: emp.employee_number,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          department: emp.departments?.name,
          annual_entitlement: annualEntitlement,
          annual_used: usedLeave.annual,
          annual_balance: annualEntitlement - usedLeave.annual,
          sick_entitlement: sickEntitlement,
          sick_used: usedLeave.sick,
          sick_balance: sickEntitlement - usedLeave.sick,
          emergency_used: usedLeave.emergency,
          unpaid_used: usedLeave.unpaid,
        };
      })
    );

    return {
      title: 'Leave Balance Report',
      generated_at: new Date().toISOString(),
      parameters: params,
      data: leaveData,
      summary: {
        total_employees: leaveData.length,
        total_annual_used: leaveData.reduce((sum, e) => sum + e.annual_used, 0),
        total_sick_used: leaveData.reduce((sum, e) => sum + e.sick_used, 0),
      },
    };
  }

  /**
   * 4. Overtime Analysis Report
   */
  private async generateOvertimeAnalysis(params: ReportParameters): Promise<ReportData> {
    const { start_date, end_date } = params;

    const { data, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        overtime_hours,
        employees(employee_number, first_name, last_name, departments(id, name))
      `)
      .gte('attendance_date', start_date)
      .lte('attendance_date', end_date)
      .gt('overtime_hours', 0);

    if (error) throw new Error(`Failed to fetch overtime: ${error.message}`);

    // Group by employee
    const employeeOT = new Map();
    data.forEach((record: any) => {
      const empId = record.employee_id;
      if (!employeeOT.has(empId)) {
        employeeOT.set(empId, {
          employee_number: record.employees?.employee_number,
          employee_name: `${record.employees?.first_name} ${record.employees?.last_name}`,
          department: record.employees?.departments?.name,
          department_id: record.employees?.departments?.id,
          total_overtime: 0,
          days_with_overtime: 0,
        });
      }
      const emp = employeeOT.get(empId);
      emp.total_overtime += record.overtime_hours || 0;
      emp.days_with_overtime += 1;
    });

    const reportData = Array.from(employeeOT.values()).sort(
      (a, b) => b.total_overtime - a.total_overtime
    );

    // Group by department
    const deptOT = new Map();
    reportData.forEach((emp: any) => {
      if (!deptOT.has(emp.department_id)) {
        deptOT.set(emp.department_id, {
          department: emp.department,
          total_overtime: 0,
          employee_count: 0,
        });
      }
      const dept = deptOT.get(emp.department_id);
      dept.total_overtime += emp.total_overtime;
      dept.employee_count += 1;
    });

    return {
      title: `Overtime Analysis - ${start_date} to ${end_date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_overtime_hours: reportData.reduce((sum, e) => sum + e.total_overtime, 0),
        employees_with_overtime: reportData.length,
        by_department: Array.from(deptOT.values()),
      },
    };
  }

  /**
   * 5. Department Headcount Report
   */
  private async generateDepartmentHeadcount(params: ReportParameters): Promise<ReportData> {
    const { data: departments, error } = await this.supabase
      .from('departments')
      .select(`
        id,
        name,
        code,
        employees(id, status)
      `)
      .order('name');

    if (error) throw new Error(`Failed to fetch departments: ${error.message}`);

    const reportData = departments.map((dept: any) => {
      const employees = dept.employees || [];
      return {
        department_code: dept.code,
        department_name: dept.name,
        total_employees: employees.length,
        active: employees.filter((e: any) => e.status === 'active').length,
        on_leave: employees.filter((e: any) => e.status === 'on_leave').length,
        terminated: employees.filter((e: any) => e.status === 'terminated').length,
        suspended: employees.filter((e: any) => e.status === 'suspended').length,
      };
    });

    return {
      title: 'Department Headcount Report',
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_departments: reportData.length,
        total_employees: reportData.reduce((sum, d) => sum + d.total_employees, 0),
        total_active: reportData.reduce((sum, d) => sum + d.active, 0),
      },
    };
  }

  /**
   * 6. Absence Report
   */
  private async generateAbsenceReport(params: ReportParameters): Promise<ReportData> {
    const { start_date, end_date } = params;

    const { data, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        attendance_date,
        status,
        notes,
        employees(employee_number, first_name, last_name, departments(name))
      `)
      .gte('attendance_date', start_date)
      .lte('attendance_date', end_date)
      .eq('status', 'ABSENT')
      .order('attendance_date');

    if (error) throw new Error(`Failed to fetch absences: ${error.message}`);

    // Group by employee
    const employeeAbsences = new Map();
    data.forEach((record: any) => {
      const empId = record.employee_id;
      if (!employeeAbsences.has(empId)) {
        employeeAbsences.set(empId, {
          employee_number: record.employees?.employee_number,
          employee_name: `${record.employees?.first_name} ${record.employees?.last_name}`,
          department: record.employees?.departments?.name,
          absence_count: 0,
          absence_dates: [],
        });
      }
      const emp = employeeAbsences.get(empId);
      emp.absence_count += 1;
      emp.absence_dates.push(record.attendance_date);
    });

    const reportData = Array.from(employeeAbsences.values()).sort(
      (a, b) => b.absence_count - a.absence_count
    );

    return {
      title: `Absence Report - ${start_date} to ${end_date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_absences: data.length,
        employees_with_absences: reportData.length,
      },
    };
  }

  /**
   * 7. Late Arrivals Report
   */
  private async generateLateArrivals(params: ReportParameters): Promise<ReportData> {
    const { start_date, end_date } = params;

    const { data, error } = await this.supabase
      .from('attendance_records')
      .select(`
        employee_id,
        attendance_date,
        check_in,
        metadata,
        employees(employee_number, first_name, last_name, departments(name))
      `)
      .gte('attendance_date', start_date)
      .lte('attendance_date', end_date)
      .eq('status', 'LATE')
      .order('attendance_date');

    if (error) throw new Error(`Failed to fetch late arrivals: ${error.message}`);

    const reportData = data.map((record: any) => ({
      employee_number: record.employees?.employee_number,
      employee_name: `${record.employees?.first_name} ${record.employees?.last_name}`,
      department: record.employees?.departments?.name,
      date: record.attendance_date,
      check_in_time: record.check_in,
      late_minutes: record.metadata?.late_minutes || 0,
    }));

    // Group by employee for summary
    const employeeLate = new Map();
    reportData.forEach((record: any) => {
      const key = record.employee_number;
      if (!employeeLate.has(key)) {
        employeeLate.set(key, {
          employee_number: record.employee_number,
          employee_name: record.employee_name,
          late_count: 0,
          total_late_minutes: 0,
        });
      }
      const emp = employeeLate.get(key);
      emp.late_count += 1;
      emp.total_late_minutes += record.late_minutes;
    });

    return {
      title: `Late Arrivals Report - ${start_date} to ${end_date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_late_arrivals: reportData.length,
        employees_with_lates: employeeLate.size,
        by_employee: Array.from(employeeLate.values()),
      },
    };
  }

  /**
   * 8. Employee Directory Report
   */
  private async generateEmployeeDirectory(params: ReportParameters): Promise<ReportData> {
    const { data, error } = await this.supabase
      .from('employees')
      .select(`
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        position,
        status,
        hire_date,
        departments(name),
        metadata
      `)
      .eq('status', 'active')
      .order('employee_number');

    if (error) throw new Error(`Failed to fetch employees: ${error.message}`);

    const reportData = data.map((emp: any) => ({
      employee_number: emp.employee_number,
      full_name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      department: emp.departments?.name,
      hire_date: emp.hire_date,
      status: emp.status,
      national_id: emp.metadata?.national_id,
      emergency_contact: emp.metadata?.emergency_contact,
    }));

    return {
      title: 'Employee Directory',
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_employees: reportData.length,
      },
    };
  }

  /**
   * 9. License Expiry Report
   */
  private async generateLicenseExpiry(params: ReportParameters): Promise<ReportData> {
    const today = new Date();
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const { data, error } = await this.supabase
      .from('employees')
      .select(`
        employee_number,
        first_name,
        last_name,
        departments(name),
        metadata
      `)
      .eq('status', 'active');

    if (error) throw new Error(`Failed to fetch employees: ${error.message}`);

    const reportData: any[] = [];

    data.forEach((emp: any) => {
      const licenses = emp.metadata?.licenses || [];
      licenses.forEach((license: any) => {
        const expiryDate = new Date(license.expiry_date);
        if (expiryDate >= today && expiryDate <= in90Days) {
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          reportData.push({
            employee_number: emp.employee_number,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            department: emp.departments?.name,
            license_type: license.type,
            license_number: license.number,
            issue_date: license.issue_date,
            expiry_date: license.expiry_date,
            days_until_expiry: daysUntilExpiry,
            status: daysUntilExpiry <= 30 ? 'Critical' : 'Warning',
          });
        }
      });
    });

    reportData.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    return {
      title: 'License Expiry Report (Next 90 Days)',
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_expiring: reportData.length,
        critical: reportData.filter((l) => l.status === 'Critical').length,
        warning: reportData.filter((l) => l.status === 'Warning').length,
      },
    };
  }

  /**
   * 10. Payroll Cost Report
   */
  private async generatePayrollCost(params: ReportParameters): Promise<ReportData> {
    const { start_date, end_date } = params;

    const { data, error } = await this.supabase
      .from('payroll_transactions')
      .select(`
        *,
        employees(departments(id, name))
      `)
      .gte('created_at', start_date)
      .lte('created_at', end_date);

    if (error) throw new Error(`Failed to fetch payroll: ${error.message}`);

    // Group by department
    const deptCosts = new Map();
    data.forEach((payroll: any) => {
      const deptId = payroll.employees?.departments?.id;
      const deptName = payroll.employees?.departments?.name || 'Unknown';
      
      if (!deptCosts.has(deptId)) {
        deptCosts.set(deptId, {
          department: deptName,
          employee_count: 0,
          total_basic: 0,
          total_allowances: 0,
          total_overtime: 0,
          total_bonus: 0,
          total_gross: 0,
          total_deductions: 0,
          total_net: 0,
        });
      }

      const dept = deptCosts.get(deptId);
      dept.employee_count += 1;
      dept.total_basic += payroll.basic_salary || 0;
      dept.total_allowances += payroll.allowances || 0;
      dept.total_overtime += payroll.overtime_pay || 0;
      dept.total_bonus += payroll.bonus || 0;
      dept.total_gross += payroll.gross_salary || 0;
      dept.total_deductions += payroll.deductions || 0;
      dept.total_net += payroll.net_salary || 0;
    });

    const reportData = Array.from(deptCosts.values()).sort(
      (a, b) => b.total_gross - a.total_gross
    );

    return {
      title: `Payroll Cost Report - ${start_date} to ${end_date}`,
      generated_at: new Date().toISOString(),
      parameters: params,
      data: reportData,
      summary: {
        total_departments: reportData.length,
        total_employees: reportData.reduce((sum, d) => sum + d.employee_count, 0),
        total_gross: reportData.reduce((sum, d) => sum + d.total_gross, 0),
        total_net: reportData.reduce((sum, d) => sum + d.total_net, 0),
      },
    };
  }
}

export const reportGenerator = new ReportGenerator();
