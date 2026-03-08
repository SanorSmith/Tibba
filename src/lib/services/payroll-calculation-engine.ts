/**
 * Comprehensive Payroll Calculation Engine
 * Integrates with attendance, leave, loans, and advances
 */

import { Pool } from 'pg';
import { calculateIraqiTax } from './iraq-tax-calculator';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface EmployeeCompensation {
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  salary_grade: string;
  currency: string;
}

export interface AttendanceData {
  worked_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  night_shifts: number;
  weekend_shifts: number;
  holiday_shifts: number;
  late_arrivals: number;
  early_departures: number;
}

export interface LoanDeduction {
  loan_id: string;
  monthly_installment: number;
  remaining_balance: number;
}

export interface AdvanceDeduction {
  advance_id: string;
  deduction_amount: number;
  remaining_balance: number;
}

export interface EarningsBreakdown {
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  overtime_pay: number;
  night_shift_pay: number;
  weekend_pay: number;
  holiday_pay: number;
  hazard_pay: number;
  bonuses: number;
  gross_salary: number;
}

export interface DeductionsBreakdown {
  social_security: number;
  health_insurance: number;
  income_tax: number;
  loan_deduction: number;
  advance_deduction: number;
  absence_deduction: number;
  total_deductions: number;
}

export interface PayrollCalculation {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  salary_grade: string;
  earnings: EarningsBreakdown;
  deductions: DeductionsBreakdown;
  net_salary: number;
  currency: string;
  attendance_data: AttendanceData;
  is_pro_rata: boolean;
  warnings: string[];
  errors: string[];
  calculation_metadata: any;
}

// =====================================================
// PAYROLL CALCULATION ENGINE
// =====================================================

export class PayrollCalculationEngine {
  private pool: Pool;
  
  // Configuration constants
  private readonly OVERTIME_RATE_REGULAR = 1.5;
  private readonly OVERTIME_RATE_WEEKEND = 2.0;
  private readonly OVERTIME_RATE_HOLIDAY = 2.0;
  private readonly NIGHT_SHIFT_ALLOWANCE = 50; // USD per shift
  private readonly HAZARD_PAY_PER_SHIFT = 50; // USD per shift
  private readonly STANDARD_WORKING_HOURS_PER_DAY = 8;
  private readonly STANDARD_WORKING_DAYS_PER_MONTH = 22;
  private readonly DAYS_IN_MONTH = 30;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }
  
  /**
   * Calculate payroll for a single employee for a specific period
   */
  async calculateEmployeePayroll(
    employeeId: string,
    periodId: string
  ): Promise<PayrollCalculation> {
    try {
      // 1. Get employee compensation
      const compensation = await this.getEmployeeCompensation(employeeId);
      
      // 2. Get employee details
      const employee = await this.getEmployeeDetails(employeeId);
      
      // 3. Get period details
      const period = await this.getPeriodDetails(periodId);
      
      // 4. Get attendance data for period
      const attendance = await this.getAttendanceData(employeeId, period.start_date, period.end_date);
      
      // 5. Calculate earnings
      const earnings = await this.calculateEarnings(
        compensation,
        attendance,
        period.start_date,
        period.end_date,
        employee.hire_date
      );
      
      // 6. Calculate deductions
      const deductions = await this.calculateDeductions(
        employeeId,
        earnings.gross_salary,
        attendance,
        compensation.basic_salary,
        periodId
      );
      
      // 7. Calculate net salary
      const netSalary = earnings.gross_salary - deductions.total_deductions;
      
      // 8. Validate and generate warnings/errors
      const { warnings, errors } = this.validatePayroll(netSalary, earnings, deductions, attendance);
      
      // 9. Check if pro-rata calculation
      const isProRata = this.isProRataCalculation(employee.hire_date, period.start_date);
      
      return {
        employee_id: employeeId,
        employee_name: employee.name,
        employee_number: employee.number,
        department: employee.department,
        salary_grade: compensation.salary_grade,
        earnings,
        deductions,
        net_salary: netSalary,
        currency: compensation.currency,
        attendance_data: attendance,
        is_pro_rata: isProRata,
        warnings,
        errors,
        calculation_metadata: {
          period_id: periodId,
          calculated_at: new Date().toISOString(),
          calculation_version: '2.0'
        }
      };
      
    } catch (error: any) {
      throw new Error(`Failed to calculate payroll for employee ${employeeId}: ${error.message}`);
    }
  }
  
  /**
   * Calculate earnings breakdown
   */
  private async calculateEarnings(
    compensation: EmployeeCompensation,
    attendance: AttendanceData,
    periodStart: Date,
    periodEnd: Date,
    hireDate: Date
  ): Promise<EarningsBreakdown> {
    let basicSalary = compensation.basic_salary;
    let housingAllowance = compensation.housing_allowance;
    let transportAllowance = compensation.transport_allowance;
    let mealAllowance = compensation.meal_allowance;
    
    // Pro-rata calculation for new employees
    if (this.isProRataCalculation(hireDate, periodStart)) {
      const proRataFactor = this.calculateProRataFactor(hireDate, periodStart, periodEnd);
      basicSalary *= proRataFactor;
      housingAllowance *= proRataFactor;
      transportAllowance *= proRataFactor;
      mealAllowance *= proRataFactor;
    }
    
    // Calculate overtime pay
    const hourlyRate = basicSalary / (this.STANDARD_WORKING_DAYS_PER_MONTH * this.STANDARD_WORKING_HOURS_PER_DAY);
    const overtimePay = attendance.overtime_hours * hourlyRate * this.OVERTIME_RATE_REGULAR;
    
    // Calculate shift differentials
    const nightShiftPay = attendance.night_shifts * this.NIGHT_SHIFT_ALLOWANCE;
    const weekendPay = attendance.weekend_shifts * hourlyRate * this.STANDARD_WORKING_HOURS_PER_DAY * this.OVERTIME_RATE_WEEKEND;
    const holidayPay = attendance.holiday_shifts * hourlyRate * this.STANDARD_WORKING_HOURS_PER_DAY * this.OVERTIME_RATE_HOLIDAY;
    
    // Hazard pay (if applicable)
    const hazardPay = 0; // Can be calculated based on shift metadata
    
    // Bonuses (fetch from database)
    const bonuses = await this.getEmployeeBonuses(compensation.employee_id, periodStart, periodEnd);
    
    const grossSalary = 
      basicSalary +
      housingAllowance +
      transportAllowance +
      mealAllowance +
      overtimePay +
      nightShiftPay +
      weekendPay +
      holidayPay +
      hazardPay +
      bonuses;
    
    return {
      basic_salary: basicSalary,
      housing_allowance: housingAllowance,
      transport_allowance: transportAllowance,
      meal_allowance: mealAllowance,
      overtime_pay: overtimePay,
      night_shift_pay: nightShiftPay,
      weekend_pay: weekendPay,
      holiday_pay: holidayPay,
      hazard_pay: hazardPay,
      bonuses: bonuses,
      gross_salary: grossSalary
    };
  }
  
  /**
   * Calculate deductions breakdown
   */
  private async calculateDeductions(
    employeeId: string,
    grossSalary: number,
    attendance: AttendanceData,
    basicSalary: number,
    periodId: string
  ): Promise<DeductionsBreakdown> {
    // Social security (get rate from rules)
    const socialSecurityRate = await this.getSocialSecurityRate();
    const socialSecurity = grossSalary * (socialSecurityRate / 100);
    
    // Health insurance (fixed amount)
    const healthInsurance = 0;
    
    // Income tax (Iraqi progressive rates)
    const taxResult = calculateIraqiTax(grossSalary, 0);
    const incomeTax = taxResult.taxUSD;
    
    // Loan deductions
    const loanDeduction = await this.calculateLoanDeductions(employeeId);
    
    // Advance deductions
    const advanceDeduction = await this.calculateAdvanceDeductions(employeeId);
    
    // Absence deductions
    const absenceDeduction = this.calculateAbsenceDeduction(
      attendance.absent_days,
      basicSalary
    );
    
    const totalDeductions =
      socialSecurity +
      healthInsurance +
      incomeTax +
      loanDeduction +
      advanceDeduction +
      absenceDeduction;
    
    return {
      social_security: socialSecurity,
      health_insurance: healthInsurance,
      income_tax: incomeTax,
      loan_deduction: loanDeduction,
      advance_deduction: advanceDeduction,
      absence_deduction: absenceDeduction,
      total_deductions: totalDeductions
    };
  }
  
  /**
   * Get employee compensation details
   */
  private async getEmployeeCompensation(employeeId: string): Promise<EmployeeCompensation> {
    const result = await this.pool.query(`
      SELECT 
        ec.employee_id,
        ec.basic_salary,
        ec.housing_allowance,
        ec.transport_allowance,
        ec.meal_allowance,
        ec.currency,
        sg.grade_code as salary_grade
      FROM employee_compensation ec
      LEFT JOIN salary_grades sg ON ec.salary_grade_id = sg.id
      WHERE ec.employee_id = $1 
        AND ec.is_active = true
      ORDER BY ec.effective_from DESC
      LIMIT 1
    `, [employeeId]);
    
    if (result.rows.length === 0) {
      throw new Error(`No active compensation found for employee ${employeeId}`);
    }
    
    const row = result.rows[0];
    return {
      employee_id: row.employee_id,
      basic_salary: parseFloat(row.basic_salary),
      housing_allowance: parseFloat(row.housing_allowance),
      transport_allowance: parseFloat(row.transport_allowance),
      meal_allowance: parseFloat(row.meal_allowance),
      salary_grade: row.salary_grade,
      currency: row.currency
    };
  }
  
  /**
   * Get employee details
   */
  private async getEmployeeDetails(employeeId: string) {
    const result = await this.pool.query(`
      SELECT 
        staffid,
        CONCAT(firstname, ' ', COALESCE(lastname, '')) as name,
        COALESCE(custom_staff_id, staffid::text) as number,
        unit as department,
        createdat::date as hire_date
      FROM staff
      WHERE staffid = $1
    `, [employeeId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Employee ${employeeId} not found`);
    }
    
    return result.rows[0];
  }
  
  /**
   * Get period details
   */
  private async getPeriodDetails(periodId: string) {
    const result = await this.pool.query(`
      SELECT start_date, end_date, period_name
      FROM payroll_periods
      WHERE id = $1
    `, [periodId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Period ${periodId} not found`);
    }
    
    return result.rows[0];
  }
  
  /**
   * Get attendance data for period
   */
  private async getAttendanceData(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceData> {
    // Get daily attendance records
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PRESENT') as worked_days,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days,
        COUNT(*) FILTER (WHERE status = 'LEAVE') as leave_days,
        COALESCE(SUM(overtime_hours), 0) as overtime_hours,
        COUNT(*) FILTER (WHERE shift_name LIKE '%Night%') as night_shifts,
        COUNT(*) FILTER (WHERE late_arrival_minutes > 0) as late_arrivals,
        COUNT(*) FILTER (WHERE early_departure_min > 0) as early_departures
      FROM daily_attendance
      WHERE employee_id = $1
        AND date BETWEEN $2 AND $3
    `, [employeeId, startDate, endDate]);
    
    const data = result.rows[0];
    
    return {
      worked_days: parseInt(data.worked_days) || 0,
      absent_days: parseInt(data.absent_days) || 0,
      leave_days: parseInt(data.leave_days) || 0,
      overtime_hours: parseFloat(data.overtime_hours) || 0,
      night_shifts: parseInt(data.night_shifts) || 0,
      weekend_shifts: 0,
      holiday_shifts: 0,
      late_arrivals: parseInt(data.late_arrivals) || 0,
      early_departures: parseInt(data.early_departures) || 0
    };
  }
  
  /**
   * Get social security contribution rate
   */
  private async getSocialSecurityRate(): Promise<number> {
    const result = await this.pool.query(`
      SELECT employee_contribution_rate
      FROM social_security_rules
      WHERE is_active = true
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY effective_from DESC
      LIMIT 1
    `);
    
    return result.rows.length > 0 ? parseFloat(result.rows[0].employee_contribution_rate) : 9.0;
  }
  
  /**
   * Calculate loan deductions for the month
   */
  private async calculateLoanDeductions(employeeId: string): Promise<number> {
    const result = await this.pool.query(`
      SELECT COALESCE(SUM(monthly_installment), 0) as total
      FROM employee_loans
      WHERE employee_id = $1
        AND status = 'ACTIVE'
        AND paid_installments < total_installments
    `, [employeeId]);
    
    return parseFloat(result.rows[0].total) || 0;
  }
  
  /**
   * Calculate advance deductions for the month
   */
  private async calculateAdvanceDeductions(employeeId: string): Promise<number> {
    const result = await this.pool.query(`
      SELECT COALESCE(SUM(deduction_amount), 0) as total
      FROM employee_advances
      WHERE employee_id = $1
        AND status = 'DEDUCTING'
        AND deducted_months < deduction_months
    `, [employeeId]);
    
    return parseFloat(result.rows[0].total) || 0;
  }
  
  /**
   * Get employee bonuses for a period
   */
  private async getEmployeeBonuses(employeeId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM employee_bonuses
        WHERE employee_id = $1
          AND status = 'APPROVED'
          AND created_at BETWEEN $2 AND $3
      `, [employeeId, periodStart, periodEnd]);
      return parseFloat(result.rows[0].total) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate absence deduction
   */
  private calculateAbsenceDeduction(absentDays: number, basicSalary: number): number {
    if (absentDays === 0) return 0;
    
    const dailyRate = basicSalary / this.DAYS_IN_MONTH;
    return absentDays * dailyRate;
  }
  
  /**
   * Check if pro-rata calculation is needed
   */
  private isProRataCalculation(hireDate: Date, periodStart: Date): boolean {
    return new Date(hireDate) > new Date(periodStart);
  }
  
  /**
   * Calculate pro-rata factor
   */
  private calculateProRataFactor(hireDate: Date, periodStart: Date, periodEnd: Date): number {
    const hire = new Date(hireDate);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    if (hire <= start) return 1.0;
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workedDays = Math.ceil((end.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return workedDays / totalDays;
  }
  
  /**
   * Validate payroll calculation and generate warnings/errors
   */
  private validatePayroll(
    netSalary: number,
    earnings: EarningsBreakdown,
    deductions: DeductionsBreakdown,
    attendance: AttendanceData
  ): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Error: Negative net salary
    if (netSalary < 0) {
      errors.push(`Net salary is negative: ${netSalary.toFixed(2)}`);
    }
    
    // Warning: Net salary less than 50% of basic
    if (netSalary < earnings.basic_salary * 0.5) {
      warnings.push(`Net salary is ${((netSalary / earnings.basic_salary) * 100).toFixed(1)}% of basic salary`);
    }
    
    // Warning: High overtime
    if (attendance.overtime_hours > 40) {
      warnings.push(`High overtime hours: ${attendance.overtime_hours.toFixed(1)}h`);
    }
    
    // Warning: Excessive overtime (capped at 60)
    if (attendance.overtime_hours > 60) {
      warnings.push(`Overtime exceeded 60 hours - should be capped`);
    }
    
    // Warning: No attendance records
    if (attendance.worked_days === 0 && attendance.leave_days === 0) {
      warnings.push('No attendance records found for period');
    }
    
    // Warning: High absence rate
    const totalDays = attendance.worked_days + attendance.absent_days + attendance.leave_days;
    if (totalDays > 0 && attendance.absent_days / totalDays > 0.2) {
      warnings.push(`High absence rate: ${((attendance.absent_days / totalDays) * 100).toFixed(1)}%`);
    }
    
    return { warnings, errors };
  }
  
  /**
   * Process payroll for entire period
   */
  async processPayrollForPeriod(periodId: string, employeeIds?: string[]): Promise<{
    period_id: string;
    total_employees: number;
    successful: number;
    failed: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    records: PayrollCalculation[];
    errors: Array<{ employee_id: string; error: string }>;
  }> {
    try {
      // Get all employees if not specified
      let employees: string[];
      if (employeeIds && employeeIds.length > 0) {
        employees = employeeIds;
      } else {
        const result = await this.pool.query(`
          SELECT DISTINCT employee_id 
          FROM employee_compensation 
          WHERE is_active = true
        `);
        employees = result.rows.map(r => r.employee_id);
      }
      
      const records: PayrollCalculation[] = [];
      const errors: Array<{ employee_id: string; error: string }> = [];
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      
      // Calculate payroll for each employee
      for (const employeeId of employees) {
        try {
          const calculation = await this.calculateEmployeePayroll(employeeId, periodId);
          records.push(calculation);
          totalGross += calculation.earnings.gross_salary;
          totalDeductions += calculation.deductions.total_deductions;
          totalNet += calculation.net_salary;
        } catch (error: any) {
          errors.push({
            employee_id: employeeId,
            error: error.message
          });
        }
      }
      
      return {
        period_id: periodId,
        total_employees: employees.length,
        successful: records.length,
        failed: errors.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        records,
        errors
      };
      
    } catch (error: any) {
      throw new Error(`Failed to process payroll for period ${periodId}: ${error.message}`);
    }
  }
  
  /**
   * Save payroll calculations to database
   */
  async savePayrollTransactions(periodId: string, calculations: PayrollCalculation[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const calc of calculations) {
        await client.query(`
          INSERT INTO payroll_transactions (
            period_id, employee_id, employee_number, employee_name, department, salary_grade,
            basic_salary, housing_allowance, transport_allowance, meal_allowance,
            overtime_pay, night_shift_pay, weekend_pay, holiday_pay, hazard_pay, bonuses,
            gross_salary, social_security, health_insurance, income_tax,
            loan_deduction, advance_deduction, absence_deduction, total_deductions,
            net_salary, currency, worked_days, absent_days, leave_days,
            overtime_hours, night_shifts, weekend_shifts, holiday_shifts,
            is_pro_rata, calculation_metadata, warnings, errors, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38
          )
          ON CONFLICT (period_id, employee_id) 
          DO UPDATE SET
            basic_salary = EXCLUDED.basic_salary,
            gross_salary = EXCLUDED.gross_salary,
            total_deductions = EXCLUDED.total_deductions,
            net_salary = EXCLUDED.net_salary,
            updated_at = NOW()
        `, [
          periodId, 
          calc.employee_id, 
          calc.employee_number || '', 
          calc.employee_name || '',
          calc.department || '', 
          calc.salary_grade || '',
          calc.earnings.basic_salary || 0, 
          calc.earnings.housing_allowance || 0,
          calc.earnings.transport_allowance || 0, 
          calc.earnings.meal_allowance || 0,
          calc.earnings.overtime_pay || 0, 
          calc.earnings.night_shift_pay || 0,
          calc.earnings.weekend_pay || 0, 
          calc.earnings.holiday_pay || 0,
          calc.earnings.hazard_pay || 0, 
          calc.earnings.bonuses || 0,
          calc.earnings.gross_salary || 0,
          calc.deductions.social_security || 0, 
          calc.deductions.health_insurance || 0,
          calc.deductions.income_tax || 0, 
          calc.deductions.loan_deduction || 0,
          calc.deductions.advance_deduction || 0, 
          calc.deductions.absence_deduction || 0,
          calc.deductions.total_deductions || 0,
          calc.net_salary || 0, 
          calc.currency || 'USD',
          calc.attendance_data.worked_days || 0, 
          calc.attendance_data.absent_days || 0,
          calc.attendance_data.leave_days || 0, 
          calc.attendance_data.overtime_hours || 0,
          calc.attendance_data.night_shifts || 0, 
          calc.attendance_data.weekend_shifts || 0,
          calc.attendance_data.holiday_shifts || 0,
          calc.is_pro_rata || false, 
          JSON.stringify(calc.calculation_metadata || {}),
          (calc.warnings || []).map(w => String(w)), 
          (calc.errors || []).map(e => String(e)),
          calc.errors.length > 0 ? 'ON_HOLD' : 'CALCULATED'
        ]);
      }
      
      // Update period summary
      await client.query(`
        UPDATE payroll_periods
        SET 
          total_employees = (SELECT COUNT(*) FROM payroll_transactions WHERE period_id = $1),
          total_gross = (SELECT COALESCE(SUM(gross_salary), 0) FROM payroll_transactions WHERE period_id = $1),
          total_deductions = (SELECT COALESCE(SUM(total_deductions), 0) FROM payroll_transactions WHERE period_id = $1),
          total_net = (SELECT COALESCE(SUM(net_salary), 0) FROM payroll_transactions WHERE period_id = $1),
          calculation_completed_at = NOW(),
          status = 'CALCULATED'
        WHERE id = $1
      `, [periodId]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export function createPayrollCalculationEngine(pool: Pool): PayrollCalculationEngine {
  return new PayrollCalculationEngine(pool);
}
