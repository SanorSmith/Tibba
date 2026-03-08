import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/reports/payroll
 * Generate payroll reports with various filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const periodId = searchParams.get('period_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employee_id');

    switch (reportType) {
      case 'summary':
        return await getPayrollSummary(periodId, startDate, endDate, department);
      
      case 'detailed':
        return await getDetailedReport(periodId, department);
      
      case 'department':
        return await getDepartmentAnalysis(periodId, startDate, endDate);
      
      case 'employee':
        return await getEmployeeReport(employeeId, startDate, endDate);
      
      case 'deductions':
        return await getDeductionsReport(periodId, startDate, endDate);
      
      case 'ytd':
        return await getYearToDateReport(new Date().getFullYear());
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error generating payroll report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Payroll Summary Report
 */
async function getPayrollSummary(
  periodId?: string | null,
  startDate?: string | null,
  endDate?: string | null,
  department?: string | null
) {
  let query = `
    SELECT 
      pp.period_name,
      pp.start_date,
      pp.end_date,
      COUNT(DISTINCT pt.employee_id) as total_employees,
      SUM(pt.basic_salary) as total_basic,
      SUM(pt.housing_allowance) as total_housing,
      SUM(pt.transport_allowance) as total_transport,
      SUM(pt.meal_allowance) as total_meal,
      SUM(pt.overtime_pay) as total_overtime,
      SUM(pt.night_shift_pay) as total_night_shift,
      SUM(pt.gross_salary) as total_gross,
      SUM(pt.social_security) as total_social_security,
      SUM(pt.health_insurance) as total_health_insurance,
      SUM(pt.loan_deduction) as total_loan_deductions,
      SUM(pt.advance_deduction) as total_advance_deductions,
      SUM(pt.absence_deduction) as total_absence_deductions,
      SUM(pt.total_deductions) as total_deductions,
      SUM(pt.net_salary) as total_net,
      AVG(pt.gross_salary) as avg_gross,
      AVG(pt.net_salary) as avg_net
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (periodId) {
    params.push(periodId);
    query += ` AND pt.period_id = $${params.length}`;
  }
  
  if (startDate && endDate) {
    params.push(startDate, endDate);
    query += ` AND pp.start_date >= $${params.length - 1} AND pp.end_date <= $${params.length}`;
  }
  
  if (department) {
    params.push(department);
    query += ` AND pt.department = $${params.length}`;
  }
  
  query += ` GROUP BY pp.period_name, pp.start_date, pp.end_date ORDER BY pp.start_date DESC`;
  
  const result = await pool.query(query, params);
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'summary',
      generated_at: new Date().toISOString(),
      records: result.rows
    }
  });
}

/**
 * Detailed Payroll Report
 */
async function getDetailedReport(periodId?: string | null, department?: string | null) {
  let query = `
    SELECT 
      pt.employee_number,
      pt.employee_name,
      pt.department,
      pt.salary_grade,
      pt.basic_salary,
      pt.housing_allowance,
      pt.transport_allowance,
      pt.meal_allowance,
      pt.overtime_pay,
      pt.night_shift_pay,
      pt.weekend_pay,
      pt.holiday_pay,
      pt.gross_salary,
      pt.social_security,
      pt.health_insurance,
      pt.loan_deduction,
      pt.advance_deduction,
      pt.absence_deduction,
      pt.total_deductions,
      pt.net_salary,
      pt.worked_days,
      pt.absent_days,
      pt.leave_days,
      pt.overtime_hours,
      pt.status,
      pp.period_name,
      pp.start_date,
      pp.end_date
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (periodId) {
    params.push(periodId);
    query += ` AND pt.period_id = $${params.length}`;
  }
  
  if (department) {
    params.push(department);
    query += ` AND pt.department = $${params.length}`;
  }
  
  query += ` ORDER BY pt.employee_name`;
  
  const result = await pool.query(query, params);
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'detailed',
      generated_at: new Date().toISOString(),
      total_records: result.rows.length,
      records: result.rows
    }
  });
}

/**
 * Department Analysis Report
 */
async function getDepartmentAnalysis(
  periodId?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  let query = `
    SELECT 
      pt.department,
      COUNT(DISTINCT pt.employee_id) as employee_count,
      SUM(pt.basic_salary) as total_basic,
      SUM(pt.gross_salary) as total_gross,
      SUM(pt.total_deductions) as total_deductions,
      SUM(pt.net_salary) as total_net,
      AVG(pt.gross_salary) as avg_gross,
      AVG(pt.net_salary) as avg_net,
      SUM(pt.overtime_hours) as total_overtime_hours,
      SUM(pt.absent_days) as total_absent_days
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (periodId) {
    params.push(periodId);
    query += ` AND pt.period_id = $${params.length}`;
  }
  
  if (startDate && endDate) {
    params.push(startDate, endDate);
    query += ` AND pp.start_date >= $${params.length - 1} AND pp.end_date <= $${params.length}`;
  }
  
  query += ` GROUP BY pt.department ORDER BY total_gross DESC`;
  
  const result = await pool.query(query, params);
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'department_analysis',
      generated_at: new Date().toISOString(),
      departments: result.rows
    }
  });
}

/**
 * Employee Earnings Report
 */
async function getEmployeeReport(
  employeeId?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: 'Employee ID is required' },
      { status: 400 }
    );
  }
  
  let query = `
    SELECT 
      pt.*,
      pp.period_name,
      pp.start_date,
      pp.end_date,
      pp.payment_date
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE pt.employee_id = $1
  `;
  
  const params: any[] = [employeeId];
  
  if (startDate && endDate) {
    params.push(startDate, endDate);
    query += ` AND pp.start_date >= $${params.length - 1} AND pp.end_date <= $${params.length}`;
  }
  
  query += ` ORDER BY pp.start_date DESC`;
  
  const result = await pool.query(query, params);
  
  // Calculate totals
  const totals = result.rows.reduce((acc, row) => ({
    total_gross: acc.total_gross + parseFloat(row.gross_salary),
    total_deductions: acc.total_deductions + parseFloat(row.total_deductions),
    total_net: acc.total_net + parseFloat(row.net_salary),
    total_overtime_hours: acc.total_overtime_hours + parseFloat(row.overtime_hours || 0)
  }), { total_gross: 0, total_deductions: 0, total_net: 0, total_overtime_hours: 0 });
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'employee_earnings',
      generated_at: new Date().toISOString(),
      employee_id: employeeId,
      period_count: result.rows.length,
      totals,
      records: result.rows
    }
  });
}

/**
 * Deductions Analysis Report
 */
async function getDeductionsReport(
  periodId?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  let query = `
    SELECT 
      pp.period_name,
      COUNT(DISTINCT pt.employee_id) as employee_count,
      SUM(pt.social_security) as total_social_security,
      SUM(pt.health_insurance) as total_health_insurance,
      SUM(pt.loan_deduction) as total_loan_deductions,
      SUM(pt.advance_deduction) as total_advance_deductions,
      SUM(pt.absence_deduction) as total_absence_deductions,
      SUM(pt.total_deductions) as total_all_deductions,
      AVG(pt.total_deductions) as avg_deductions_per_employee
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (periodId) {
    params.push(periodId);
    query += ` AND pt.period_id = $${params.length}`;
  }
  
  if (startDate && endDate) {
    params.push(startDate, endDate);
    query += ` AND pp.start_date >= $${params.length - 1} AND pp.end_date <= $${params.length}`;
  }
  
  query += ` GROUP BY pp.period_name, pp.start_date ORDER BY pp.start_date DESC`;
  
  const result = await pool.query(query, params);
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'deductions_analysis',
      generated_at: new Date().toISOString(),
      records: result.rows
    }
  });
}

/**
 * Year-to-Date Report
 */
async function getYearToDateReport(year: number) {
  const query = `
    SELECT 
      pt.employee_id,
      pt.employee_number,
      pt.employee_name,
      pt.department,
      COUNT(*) as periods_paid,
      SUM(pt.basic_salary) as ytd_basic,
      SUM(pt.gross_salary) as ytd_gross,
      SUM(pt.total_deductions) as ytd_deductions,
      SUM(pt.net_salary) as ytd_net,
      SUM(pt.overtime_hours) as ytd_overtime_hours,
      SUM(pt.worked_days) as ytd_worked_days,
      SUM(pt.absent_days) as ytd_absent_days
    FROM payroll_transactions pt
    JOIN payroll_periods pp ON pt.period_id = pp.id
    WHERE EXTRACT(YEAR FROM pp.start_date) = $1
    GROUP BY pt.employee_id, pt.employee_number, pt.employee_name, pt.department
    ORDER BY pt.employee_name
  `;
  
  const result = await pool.query(query, [year]);
  
  // Calculate grand totals
  const grandTotals = result.rows.reduce((acc, row) => ({
    total_employees: acc.total_employees + 1,
    total_gross: acc.total_gross + parseFloat(row.ytd_gross),
    total_deductions: acc.total_deductions + parseFloat(row.ytd_deductions),
    total_net: acc.total_net + parseFloat(row.ytd_net)
  }), { total_employees: 0, total_gross: 0, total_deductions: 0, total_net: 0 });
  
  return NextResponse.json({
    success: true,
    data: {
      report_type: 'year_to_date',
      year,
      generated_at: new Date().toISOString(),
      grand_totals: grandTotals,
      records: result.rows
    }
  });
}
