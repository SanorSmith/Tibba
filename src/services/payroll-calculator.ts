/**
 * Payroll Calculator Service
 * Simplified version for testing
 */

// Types matching test expectations
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
  total_deductions: number;
}

interface Employee {
  id: string;
  base_salary: number;
  allowances?: Record<string, number>;
  hire_date?: Date;
}

interface AttendanceData {
  days_worked: number;
  overtime_hours: number;
  night_shifts: number;
  hazard_shifts: number;
  unpaid_leave_days?: number;
}

export class PayrollCalculator {
  /**
   * Calculate gross salary
   */
  async calculateGrossSalary(employee: Employee, attendance: AttendanceData): Promise<GrossSalaryBreakdown> {
    // Validate inputs
    if (!employee) {
      throw new Error('Employee data is required');
    }
    if (!attendance) {
      throw new Error('Attendance data is required');
    }
    if (employee.base_salary < 0) {
      throw new Error('Base salary cannot be negative');
    }
    if (attendance.overtime_hours < 0) {
      throw new Error('Overtime hours cannot be negative');
    }

    // Handle zero hours worked
    if (attendance.days_worked === 0) {
      return {
        base_salary: 0,
        allowances: 0,
        overtime_pay: 0,
        night_shift_differential: 0,
        hazard_pay: 0,
        gross_salary: 0,
      };
    }

    // Calculate base salary
    let baseSalary = employee.base_salary;
    
    // Pro-rata calculation for new employees
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date);
      const today = new Date();
      const daysInMonth = 30; // Simplified
      const daysWorked = Math.min(attendance.days_worked, daysInMonth);
      
      if (hireDate > new Date(today.getFullYear(), today.getMonth(), 1)) {
        baseSalary = (baseSalary / daysInMonth) * daysWorked;
      }
    }

    // Deduct unpaid leave
    if (attendance.unpaid_leave_days && attendance.unpaid_leave_days > 0) {
      const dailyRate = baseSalary / 30; // 30 days per month
      const unpaidDeduction = dailyRate * attendance.unpaid_leave_days;
      baseSalary = baseSalary - unpaidDeduction;
    }

    // Calculate allowances
    const allowances = Object.values(employee.allowances || {}).reduce((sum, amount) => sum + amount, 0);

    // Calculate overtime pay
    const hourlyRate = baseSalary / attendance.days_worked / 8; // 8 hours per day
    const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime
    const overtimePay = attendance.overtime_hours * overtimeRate;

    // Calculate night shift differential
    const nightShiftHourlyRate = hourlyRate * 0.30; // 30% differential
    const nightShiftDifferential = attendance.night_shifts * 8 * nightShiftHourlyRate;

    // Calculate hazard pay
    const hazardPay = attendance.hazard_shifts * 50; // 50 SAR per hazard shift

    // Calculate gross salary
    const grossSalary = baseSalary + allowances + overtimePay + nightShiftDifferential + hazardPay;

    return {
      base_salary: Math.round(baseSalary * 100) / 100,
      allowances: Math.round(allowances * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      night_shift_differential: Math.round(nightShiftDifferential * 100) / 100,
      hazard_pay: Math.round(hazardPay * 100) / 100,
      gross_salary: Math.round(grossSalary * 100) / 100,
    };
  }

  /**
   * Calculate deductions
   */
  async calculateDeductions(grossSalary: number, deductions: Record<string, number> = {}): Promise<DeductionsBreakdown> {
    // Social security (9% of gross)
    const socialSecurity = grossSalary * 0.09;

    // Health insurance
    const healthInsurance = deductions.health_insurance || 0;

    // Loan deduction
    const loanDeduction = deductions.loan_deduction || 0;

    // Advance deduction
    const advanceDeduction = deductions.advance_deduction || 0;

    // Total deductions
    const totalDeductions = socialSecurity + healthInsurance + loanDeduction + advanceDeduction;

    // Validate deductions don't exceed gross salary
    if (totalDeductions > grossSalary) {
      throw new Error('Total deductions cannot exceed gross salary');
    }

    return {
      social_security: Math.round(socialSecurity * 100) / 100,
      health_insurance: Math.round(healthInsurance * 100) / 100,
      loan_deduction: Math.round(loanDeduction * 100) / 100,
      advance_deduction: Math.round(advanceDeduction * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
    };
  }
}
