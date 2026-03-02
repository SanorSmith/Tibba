/**
 * Payslip Generator Service
 * Generates PDF payslips for employees with detailed earnings and deductions
 * Temporarily simplified for deployment
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PayslipData {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  position: string;
  pay_period: string;
  gross_salary: number;
  base_salary: number;
  allowances: number;
  overtime_pay: number;
  night_shift_differential: number;
  hazard_pay: number;
  social_security: number;
  health_insurance: number;
  loan_deduction: number;
  advance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  bank_name?: string;
  account_number?: string;
}

export class PayslipGenerator {
  private supabase = createClient(supabaseUrl, supabaseKey);

  /**
   * Generate payslip for an employee
   */
  async generatePayslip(employeeId: string, payrollId: string): Promise<Buffer> {
    try {
      // Get employee data
      const { data: employee, error: employeeError } = await this.supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (employeeError || !employee) {
        throw new Error('Employee not found');
      }

      // Get payroll data
      const { data: payroll, error: payrollError } = await this.supabase
        .from('payroll_records')
        .select('*')
        .eq('id', payrollId)
        .eq('employee_id', employeeId)
        .single();

      if (payrollError || !payroll) {
        throw new Error('Payroll record not found');
      }

      // Prepare payslip data
      const payslipData = this.preparePayslipData(employee, payroll);

      // Generate PDF (simplified for deployment)
      return await this.createPayslipPDF(payslipData);
    } catch (error) {
      console.error('Error generating payslip:', error);
      throw error;
    }
  }

  /**
   * Generate bulk payslips for multiple employees
   */
  async generateBulkPayslips(payrollId: string): Promise<{ employee_id: string; payslip: Buffer }[]> {
    try {
      // Get all payroll records for this payroll period
      const { data: payrollRecords, error } = await this.supabase
        .from('payroll_records')
        .select('employee_id')
        .eq('payroll_id', payrollId);

      if (error) {
        throw new Error('Failed to fetch payroll records');
      }

      const payslips = [];
      
      for (const record of payrollRecords || []) {
        try {
          const payslip = await this.generatePayslip(record.employee_id, payrollId);
          payslips.push({
            employee_id: record.employee_id,
            payslip
          });
        } catch (error) {
          console.error(`Failed to generate payslip for employee ${record.employee_id}:`, error);
          // Continue with other employees
        }
      }

      return payslips;
    } catch (error) {
      console.error('Error generating bulk payslips:', error);
      throw error;
    }
  }

  /**
   * Prepare payslip data from employee and payroll records
   */
  private preparePayslipData(employee: any, payroll: any): PayslipData {
    return {
      employee_id: employee.id,
      employee_number: employee.employee_number,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department || 'Not Assigned',
      position: employee.position || employee.job_title || 'Not Assigned',
      pay_period: payroll.pay_period || 'Not Specified',
      gross_salary: payroll.gross_salary || 0,
      base_salary: payroll.base_salary || 0,
      allowances: payroll.allowances || 0,
      overtime_pay: payroll.overtime_pay || 0,
      night_shift_differential: payroll.night_shift_differential || 0,
      hazard_pay: payroll.hazard_pay || 0,
      social_security: payroll.social_security || 0,
      health_insurance: payroll.health_insurance || 0,
      loan_deduction: payroll.loan_deduction || 0,
      advance_deduction: payroll.advance_deduction || 0,
      other_deductions: payroll.other_deductions || 0,
      total_deductions: payroll.total_deductions || 0,
      net_salary: payroll.net_salary || 0,
      bank_name: employee.bank_name,
      account_number: employee.account_number,
    };
  }

  /**
   * Create payslip PDF (simplified for deployment)
   */
  private async createPayslipPDF(data: PayslipData): Promise<Buffer> {
    // Temporarily return a text-based payslip for deployment
    // TODO: Re-enable PDF generation when fontkit compatibility is fixed
    const payslipText = `
===========================================
TIBBNA HOSPITAL - PAYSLIP
===========================================

Employee Information:
--------------------
Name: ${data.employee_name}
ID: ${data.employee_number}
Department: ${data.department}
Position: ${data.position}
Pay Period: ${data.pay_period}

Earnings:
--------
Base Salary: ${this.formatCurrency(data.base_salary)}
Allowances: ${this.formatCurrency(data.allowances)}
Overtime Pay: ${this.formatCurrency(data.overtime_pay)}
Night Shift: ${this.formatCurrency(data.night_shift_differential)}
Hazard Pay: ${this.formatCurrency(data.hazard_pay)}
----------------------------------------
Gross Salary: ${this.formatCurrency(data.gross_salary)}

Deductions:
-----------
Social Security: ${this.formatCurrency(data.social_security)}
Health Insurance: ${this.formatCurrency(data.health_insurance)}
Loan Deduction: ${this.formatCurrency(data.loan_deduction)}
Advance Deduction: ${this.formatCurrency(data.advance_deduction)}
Other Deductions: ${this.formatCurrency(data.other_deductions)}
----------------------------------------
Total Deductions: ${this.formatCurrency(data.total_deductions)}

Net Salary: ${this.formatCurrency(data.net_salary)}

Payment Information:
------------------
${data.bank_name ? `Bank: ${data.bank_name}` : ''}
${data.account_number ? `Account: ${this.maskAccountNumber(data.account_number)}` : ''}

===========================================
Generated on: ${new Date().toLocaleDateString()}
===========================================
    `.trim();

    return Buffer.from(payslipText, 'utf-8');
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  }

  /**
   * Format pay period
   */
  private formatPayPeriod(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SA', {
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Mask account number for security
   */
  private maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';
    const last4 = accountNumber.slice(-4);
    const masked = '*'.repeat(accountNumber.length - 4);
    return masked + last4;
  }
}
