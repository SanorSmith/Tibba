'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

/**
 * Calculate Iraqi income tax (progressive rates)
 */
function calculateIraqiIncomeTax(grossSalary: number): number {
  if (grossSalary <= 1000000) return 0;
  if (grossSalary <= 2500000) return (grossSalary - 1000000) * 0.03;
  if (grossSalary <= 5000000) return 45000 + (grossSalary - 2500000) * 0.05;
  if (grossSalary <= 10000000) return 170000 + (grossSalary - 5000000) * 0.10;
  return 670000 + (grossSalary - 10000000) * 0.15;
}

/**
 * Get payroll periods
 */
export async function getPayrollPeriods(status?: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    let query = supabaseAdmin
      .from('payroll_periods')
      .select('*')
      .eq('organization_id', session.organizationId)
      .order('period_start', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching payroll periods:', error);
    return { success: false, error: 'Failed to fetch payroll periods' };
  }
}

/**
 * Get payroll transactions for a period
 */
export async function getPayrollTransactions(periodId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('payroll_transactions')
      .select(`
        *,
        employee:employees!payroll_transactions_employee_id_fkey(
          id,
          employee_number,
          first_name,
          last_name,
          job_title,
          salary_grade,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .eq('period_id', periodId)
      .order('created_at');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching payroll transactions:', error);
    return { success: false, error: 'Failed to fetch payroll transactions' };
  }
}

/**
 * Process payroll for a period
 */
export async function processPayroll(periodData: {
  period_code: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  department_id?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Create payroll period
    const { data: period, error: periodError } = await supabaseAdmin
      .from('payroll_periods')
      .insert({
        organization_id: session.organizationId,
        period_code: periodData.period_code,
        period_start: periodData.period_start,
        period_end: periodData.period_end,
        payment_date: periodData.payment_date,
        status: 'DRAFT',
        processed_by: session.employeeId || null
      })
      .select()
      .single();

    if (periodError) throw periodError;

    // Get active employees
    let employeeQuery = supabaseAdmin
      .from('employees')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('employment_status', 'ACTIVE');

    if (periodData.department_id) {
      employeeQuery = employeeQuery.eq('department_id', periodData.department_id);
    }

    const { data: employees } = await employeeQuery;

    if (!employees || employees.length === 0) {
      throw new Error('No active employees found');
    }

    // Get attendance data for the period
    const { data: attendanceRecords } = await supabaseAdmin
      .from('attendance_records')
      .select('employee_id, status, overtime_hours')
      .eq('organization_id', session.organizationId)
      .gte('attendance_date', periodData.period_start)
      .lte('attendance_date', periodData.period_end);

    // Process each employee
    const transactions = [];
    for (const employee of employees) {
      const empAttendance = attendanceRecords?.filter(r => r.employee_id === employee.id) || [];

      // Calculate overtime
      const totalOvertimeHours = empAttendance.reduce(
        (sum, r) => sum + (r.overtime_hours || 0),
        0
      );

      const baseSalary = employee.base_salary || 0;
      const overtimePay = baseSalary > 0 ? (baseSalary / 176) * totalOvertimeHours * 1.5 : 0;

      // Calculate base components
      const housingAllowance = baseSalary * 0.25;
      const transportAllowance = baseSalary * 0.10;

      const grossSalary = baseSalary + housingAllowance + transportAllowance + overtimePay;

      // Calculate deductions (Iraqi labor law)
      const socialSecurityEmployee = grossSalary * 0.05;
      const socialSecurityEmployer = grossSalary * 0.12;
      const tax = calculateIraqiIncomeTax(grossSalary);

      // Get active loans
      const { data: loans } = await supabaseAdmin
        .from('employee_loans')
        .select('installment_amount')
        .eq('employee_id', employee.id)
        .eq('status', 'ACTIVE');

      const loanDeduction = loans?.reduce((sum, l) => sum + (l.installment_amount || 0), 0) || 0;

      const totalDeductions = socialSecurityEmployee + tax + loanDeduction;
      const netSalary = grossSalary - totalDeductions;

      transactions.push({
        period_id: period.id,
        employee_id: employee.id,
        base_salary: baseSalary,
        housing_allowance: housingAllowance,
        transport_allowance: transportAllowance,
        overtime_pay: overtimePay,
        gross_salary: grossSalary,
        tax,
        social_security_employee: socialSecurityEmployee,
        social_security_employer: socialSecurityEmployer,
        loan_deduction: loanDeduction,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        payment_status: 'PENDING'
      });
    }

    // Insert transactions
    const { error: transError } = await supabaseAdmin
      .from('payroll_transactions')
      .insert(transactions);

    if (transError) throw transError;

    // Update period totals
    const totalGross = transactions.reduce((sum, t) => sum + t.gross_salary, 0);
    const totalDeductions = transactions.reduce((sum, t) => sum + t.total_deductions, 0);
    const totalNet = transactions.reduce((sum, t) => sum + t.net_salary, 0);

    await supabaseAdmin
      .from('payroll_periods')
      .update({
        status: 'CALCULATED',
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet
      })
      .eq('id', period.id);

    revalidatePath('/hr/payroll');

    return {
      success: true,
      data: {
        period_id: period.id,
        employees_processed: transactions.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet
      }
    };
  } catch (error) {
    console.error('Error processing payroll:', error);
    return { success: false, error: 'Failed to process payroll' };
  }
}

/**
 * Approve payroll period
 */
export async function approvePayroll(periodId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('payroll_periods')
      .update({
        status: 'APPROVED',
        approved_by: session.employeeId || null
      })
      .eq('id', periodId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/payroll');

    return { success: true, data };
  } catch (error) {
    console.error('Error approving payroll:', error);
    return { success: false, error: 'Failed to approve payroll' };
  }
}

/**
 * Generate bank transfer file (CSV)
 */
export async function generateBankTransferFile(periodId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data: transactions } = await supabaseAdmin
      .from('payroll_transactions')
      .select(`
        *,
        employee:employees!payroll_transactions_employee_id_fkey(
          employee_number,
          first_name,
          last_name
        )
      `)
      .eq('period_id', periodId);

    if (!transactions || transactions.length === 0) {
      throw new Error('No transactions found');
    }

    // Generate CSV format for bank upload
    const csvRows = [
      ['Employee Number', 'Name', 'Account Number', 'Bank', 'Amount'].join(',')
    ];

    for (const trans of transactions) {
      const emp = trans.employee as any;
      csvRows.push([
        emp?.employee_number || '',
        `${emp?.first_name || ''} ${emp?.last_name || ''}`,
        trans.account_number || '',
        trans.bank_name || '',
        trans.net_salary.toFixed(2)
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    // Mark transactions as processed
    await supabaseAdmin
      .from('payroll_transactions')
      .update({ payment_status: 'PROCESSED' })
      .eq('period_id', periodId);

    revalidatePath('/hr/payroll');

    return {
      success: true,
      data: {
        filename: `bank_transfer_${periodId}.csv`,
        content: csvContent,
        count: transactions.length
      }
    };
  } catch (error) {
    console.error('Error generating bank transfer file:', error);
    return { success: false, error: 'Failed to generate bank transfer file' };
  }
}

/**
 * Get employee loans
 */
export async function getEmployeeLoans(employeeId?: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    let query = supabaseAdmin
      .from('employee_loans')
      .select(`
        *,
        employee:employees!employee_loans_employee_id_fkey(
          id,
          employee_number,
          first_name,
          last_name,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .order('loan_date', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching employee loans:', error);
    return { success: false, error: 'Failed to fetch employee loans' };
  }
}

/**
 * Create employee loan
 */
export async function createEmployeeLoan(loanData: {
  employee_id: string;
  principal_amount: number;
  interest_rate: number;
  installments: number;
  start_date: string;
  end_date?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const totalAmount = loanData.principal_amount * (1 + loanData.interest_rate / 100);
    const installmentAmount = totalAmount / loanData.installments;

    const loanNumber = `LN-${Date.now()}`;

    const { data, error } = await supabaseAdmin
      .from('employee_loans')
      .insert({
        employee_id: loanData.employee_id,
        loan_number: loanNumber,
        loan_date: new Date().toISOString().split('T')[0],
        principal_amount: loanData.principal_amount,
        interest_rate: loanData.interest_rate,
        total_amount: totalAmount,
        installments: loanData.installments,
        installment_amount: installmentAmount,
        start_date: loanData.start_date,
        end_date: loanData.end_date || null,
        status: 'ACTIVE',
        approved_by: session.employeeId || null
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/payroll/loans');

    return { success: true, data };
  } catch (error) {
    console.error('Error creating employee loan:', error);
    return { success: false, error: 'Failed to create employee loan' };
  }
}

/**
 * Get salary grades
 */
export async function getSalaryGrades() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('salary_grades')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('active', true)
      .order('grade_code');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching salary grades:', error);
    return { success: false, error: 'Failed to fetch salary grades' };
  }
}
