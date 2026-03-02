/**
 * Payroll Calculator Service
 * Automated salary computation from employee data and attendance records
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================================
// TYPES
// ============================================================================

interface GrossSalaryBreakdown {
  base_salary: number;
  allowances: number;
  overtime_pay: number;
  night_shift_differential: number;
  hazard_pay: number;
  gross_salary: number;
}

interface DeductionsBreakdown {
  social_security: number;
  health_insurance: number;
  loan_deduction: number;
  advance_deduction: number;
  absence_deduction: number;
  total_deductions: number;
  calculation_details: {
    absent_days: number;
    unpaid_leave_days: number;
  };
}

interface PayrollRecord {
  employee_id: string;
  period_id: string;
  gross_salary_breakdown: GrossSalaryBreakdown;
  deductions_breakdown: DeductionsBreakdown;
  net_salary: number;
  payment_status: string;
  warnings: string[];
  errors: string[];
  calculated_at: string;
}

interface PayrollProcessingResult {
  period_id: string;
  total_employees: number;
  successful: number;
  failed: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  records: PayrollRecord[];
  errors: Array<{ employee_id: string; error: string }>;
  warnings: Array<{ employee_id: string; warning: string }>;
}

// ============================================================================
// PAYROLL CALCULATOR CLASS
// ============================================================================

export class PayrollCalculator {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Calculate gross salary for an employee in a period
   */
  async calculateGrossSalary(
    employeeId: string,
    periodId: string
  ): Promise<GrossSalaryBreakdown> {
    try {
      // Fetch employee data
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .select('*, salary_grades(*)')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Fetch payroll period
      const { data: period, error: periodError } = await this.supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        throw new Error(`Payroll period not found: ${periodId}`);
      }

      const startDate = period.start_date;
      const endDate = period.end_date;

      // Fetch attendance records for the period
      const { data: attendance, error: attError } = await this.supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (attError) {
        throw new Error(`Failed to fetch attendance: ${attError.message}`);
      }

      // Calculate base components
      const baseSalary = employee.base_salary || 0;
      
      // Get allowances from grade or employee metadata
      const housingAllowance = employee.metadata?.housing_allowance || 
                              employee.salary_grades?.housing_allowance || 0;
      const transportAllowance = employee.metadata?.transport_allowance || 
                                employee.salary_grades?.transport_allowance || 0;
      const mealAllowance = employee.metadata?.meal_allowance || 
                           employee.salary_grades?.meal_allowance || 0;

      // Calculate attendance-based components
      const workedDays = attendance?.length || 0;
      const totalOvertimeHours = attendance?.reduce((sum, record) => 
        sum + (record.overtime_hours || 0), 0) || 0;
      
      // Count night shifts and hazard shifts
      const nightShiftCount = attendance?.filter(record => 
        record.metadata?.shift_type === 'night').length || 0;
      const hazardShiftCount = attendance?.filter(record => 
        record.metadata?.is_hazard_shift === true).length || 0;

      // Calculate overtime pay (hourly rate × 1.5)
      // Assuming 160 working hours per month (20 days × 8 hours)
      const hourlyRate = baseSalary / 160;
      const cappedOvertimeHours = Math.min(totalOvertimeHours, 60); // Max 60 hours/month
      const overtimePay = cappedOvertimeHours * hourlyRate * 1.5;

      // Night shift pay (50 SAR per shift)
      const nightShiftPay = nightShiftCount * 50;

      // Hazard pay (50 SAR per shift)
      const hazardPay = hazardShiftCount * 50;

      // Fetch bonuses for the period
      const { data: bonuses } = await this.supabase
        .from('employee_bonuses')
        .select('amount')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .eq('status', 'approved');

      const totalBonuses = bonuses?.reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Check if pro-rata calculation needed (new employee or partial month)
      const hireDate = new Date(employee.hire_date);
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const isNewEmployee = hireDate > periodStart;
      
      let finalBaseSalary = baseSalary;
      let isProRata = false;

      if (isNewEmployee) {
        // Pro-rata calculation for new employees
        const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const workedDaysInPeriod = Math.ceil((periodEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        finalBaseSalary = baseSalary * (workedDaysInPeriod / totalDaysInPeriod);
        isProRata = true;
      }

      // Calculate gross salary
      const grossSalary = 
        finalBaseSalary +
        housingAllowance +
        transportAllowance +
        mealAllowance +
        overtimePay +
        nightShiftPay +
        hazardPay +
        totalBonuses;

      return {
        base_salary: Math.round(finalBaseSalary * 100) / 100,
        housing_allowance: Math.round(housingAllowance * 100) / 100,
        transport_allowance: Math.round(transportAllowance * 100) / 100,
        meal_allowance: Math.round(mealAllowance * 100) / 100,
        overtime_pay: Math.round(overtimePay * 100) / 100,
        night_shift_pay: Math.round(nightShiftPay * 100) / 100,
        hazard_pay: Math.round(hazardPay * 100) / 100,
        bonuses: Math.round(totalBonuses * 100) / 100,
        gross_salary: Math.round(grossSalary * 100) / 100,
        calculation_details: {
          total_overtime_hours: totalOvertimeHours,
          night_shift_count: nightShiftCount,
          hazard_shift_count: hazardShiftCount,
          worked_days: workedDays,
          is_pro_rata: isProRata,
        },
      };
    } catch (error: any) {
      throw new Error(`Gross salary calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate deductions for an employee
   */
  async calculateDeductions(
    employeeId: string,
    grossSalary: number,
    periodId: string
  ): Promise<DeductionsBreakdown> {
    try {
      // Fetch employee data
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Fetch payroll period
      const { data: period, error: periodError } = await this.supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        throw new Error(`Payroll period not found: ${periodId}`);
      }

      const startDate = period.start_date;
      const endDate = period.end_date;

      // Social security (9% of gross salary)
      const socialSecurity = grossSalary * 0.09;

      // Health insurance (fixed monthly amount from employee record)
      const healthInsurance = employee.metadata?.health_insurance_amount || 0;

      // Fetch loan deductions
      const { data: loans } = await this.supabase
        .from('employee_loans')
        .select('monthly_installment')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .gte('end_date', startDate);

      const loanDeduction = loans?.reduce((sum, loan) => 
        sum + (loan.monthly_installment || 0), 0) || 0;

      // Fetch advance deductions
      const { data: advances } = await this.supabase
        .from('employee_advances')
        .select('deduction_amount')
        .eq('employee_id', employeeId)
        .eq('status', 'pending_deduction')
        .lte('deduction_date', endDate);

      const advanceDeduction = advances?.reduce((sum, advance) => 
        sum + (advance.deduction_amount || 0), 0) || 0;

      // Calculate absence deduction
      const { data: attendance } = await this.supabase
        .from('attendance_records')
        .select('status')
        .eq('employee_id', employeeId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .eq('status', 'ABSENT');

      const absentDays = attendance?.length || 0;

      // Fetch unpaid leave days
      const { data: unpaidLeaves } = await this.supabase
        .from('leave_requests')
        .select('total_days')
        .eq('employee_id', employeeId)
        .eq('status', 'APPROVED')
        .eq('metadata->>leave_type', 'unpaid')
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      const unpaidLeaveDays = unpaidLeaves?.reduce((sum, leave) => 
        sum + (leave.total_days || 0), 0) || 0;

      // Calculate daily rate (base salary / 30 days)
      const dailyRate = (employee.base_salary || 0) / 30;
      const absenceDeduction = (absentDays + unpaidLeaveDays) * dailyRate;

      // Total deductions
      const totalDeductions = 
        socialSecurity +
        healthInsurance +
        loanDeduction +
        advanceDeduction +
        absenceDeduction;

      return {
        social_security: Math.round(socialSecurity * 100) / 100,
        health_insurance: Math.round(healthInsurance * 100) / 100,
        loan_deduction: Math.round(loanDeduction * 100) / 100,
        advance_deduction: Math.round(advanceDeduction * 100) / 100,
        absence_deduction: Math.round(absenceDeduction * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        calculation_details: {
          absent_days: absentDays,
          unpaid_leave_days: unpaidLeaveDays,
        },
      };
    } catch (error: any) {
      throw new Error(`Deductions calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate net salary with validation
   */
  async calculateNetSalary(
    employeeId: string,
    periodId: string
  ): Promise<PayrollRecord> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Calculate gross salary
      const grossBreakdown = await this.calculateGrossSalary(employeeId, periodId);

      // Calculate deductions
      const deductionsBreakdown = await this.calculateDeductions(
        employeeId,
        grossBreakdown.gross_salary,
        periodId
      );

      // Calculate net salary
      const netSalary = grossBreakdown.gross_salary - deductionsBreakdown.total_deductions;

      // Validation checks
      if (netSalary < 0) {
        errors.push('Net salary is negative - requires review');
      }

      // Fetch employee base salary for validation
      const { data: employee } = await this.supabase
        .from('employees')
        .select('base_salary')
        .eq('id', employeeId)
        .single();

      const baseSalary = employee?.base_salary || 0;

      if (netSalary < baseSalary * 0.5) {
        warnings.push(`Net salary is less than 50% of base salary (${Math.round(netSalary / baseSalary * 100)}%)`);
      }

      if (grossBreakdown.calculation_details.total_overtime_hours > 40) {
        warnings.push(`High overtime hours: ${grossBreakdown.calculation_details.total_overtime_hours}h`);
      }

      if (grossBreakdown.calculation_details.total_overtime_hours > 60) {
        warnings.push('Overtime exceeded maximum cap of 60 hours - capped at 60h');
      }

      if (grossBreakdown.calculation_details.worked_days === 0) {
        warnings.push('No attendance records found for this period');
      }

      return {
        employee_id: employeeId,
        period_id: periodId,
        gross_salary_breakdown: grossBreakdown,
        deductions_breakdown: deductionsBreakdown,
        net_salary: Math.round(netSalary * 100) / 100,
        payment_status: errors.length > 0 ? 'review_required' : 'pending',
        warnings,
        errors,
        calculated_at: new Date().toISOString(),
      };
    } catch (error: any) {
      errors.push(error.message);
      
      return {
        employee_id: employeeId,
        period_id: periodId,
        gross_salary_breakdown: {
          base_salary: 0,
          housing_allowance: 0,
          transport_allowance: 0,
          meal_allowance: 0,
          overtime_pay: 0,
          night_shift_pay: 0,
          hazard_pay: 0,
          bonuses: 0,
          gross_salary: 0,
          calculation_details: {
            total_overtime_hours: 0,
            night_shift_count: 0,
            hazard_shift_count: 0,
            worked_days: 0,
            is_pro_rata: false,
          },
        },
        deductions_breakdown: {
          social_security: 0,
          health_insurance: 0,
          loan_deduction: 0,
          advance_deduction: 0,
          absence_deduction: 0,
          total_deductions: 0,
          calculation_details: {
            absent_days: 0,
            unpaid_leave_days: 0,
          },
        },
        net_salary: 0,
        payment_status: 'failed',
        warnings,
        errors,
        calculated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Process payroll for entire period (batch processing)
   */
  async processPayrollForPeriod(periodId: string): Promise<PayrollProcessingResult> {
    const result: PayrollProcessingResult = {
      period_id: periodId,
      total_employees: 0,
      successful: 0,
      failed: 0,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      records: [],
      errors: [],
      warnings: [],
    };

    try {
      // Fetch all active employees
      const { data: employees, error: empError } = await this.supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name')
        .eq('employment_status', 'ACTIVE');

      if (empError) {
        throw new Error(`Failed to fetch employees: ${empError.message}`);
      }

      result.total_employees = employees?.length || 0;

      // Process each employee
      for (const employee of employees || []) {
        try {
          // Calculate payroll
          const payrollRecord = await this.calculateNetSalary(employee.id, periodId);
          
          // Save to database
          const { error: saveError } = await this.supabase
            .from('payroll_transactions')
            .insert({
              period_id: periodId,
              employee_id: employee.id,
              basic_salary: payrollRecord.gross_salary_breakdown.base_salary,
              allowances: 
                payrollRecord.gross_salary_breakdown.housing_allowance +
                payrollRecord.gross_salary_breakdown.transport_allowance +
                payrollRecord.gross_salary_breakdown.meal_allowance,
              overtime_pay: payrollRecord.gross_salary_breakdown.overtime_pay,
              bonus: 
                payrollRecord.gross_salary_breakdown.night_shift_pay +
                payrollRecord.gross_salary_breakdown.hazard_pay +
                payrollRecord.gross_salary_breakdown.bonuses,
              deductions: payrollRecord.deductions_breakdown.total_deductions,
              gross_salary: payrollRecord.gross_salary_breakdown.gross_salary,
              net_salary: payrollRecord.net_salary,
              status: payrollRecord.payment_status,
              metadata: {
                gross_breakdown: payrollRecord.gross_salary_breakdown,
                deductions_breakdown: payrollRecord.deductions_breakdown,
                warnings: payrollRecord.warnings,
                errors: payrollRecord.errors,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (saveError) {
            result.errors.push({
              employee_id: employee.id,
              error: `Failed to save: ${saveError.message}`,
            });
            result.failed++;
          } else {
            result.successful++;
            result.total_gross += payrollRecord.gross_salary_breakdown.gross_salary;
            result.total_deductions += payrollRecord.deductions_breakdown.total_deductions;
            result.total_net += payrollRecord.net_salary;
            result.records.push(payrollRecord);

            // Collect warnings
            if (payrollRecord.warnings.length > 0) {
              payrollRecord.warnings.forEach(warning => {
                result.warnings.push({
                  employee_id: employee.id,
                  warning: `${employee.employee_number} - ${warning}`,
                });
              });
            }
          }
        } catch (error: any) {
          result.errors.push({
            employee_id: employee.id,
            error: error.message,
          });
          result.failed++;
        }
      }

      return result;
    } catch (error: any) {
      throw new Error(`Payroll processing failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const payrollCalculator = new PayrollCalculator();
