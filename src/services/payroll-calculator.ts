/**
 * Payroll Calculator Service
 * Enhanced with attendance exceptions integration
 */
import { Pool } from 'pg';

// Types matching test expectations
interface GrossSalaryBreakdown {
  base_salary: number;
  allowances: number;
  overtime_pay: number;
  night_shift_differential: number;
  hazard_pay: number;
  attendance_bonus?: number;
  attendance_bonus_percentage?: number;
  gross_salary: number;
  attendance_impact?: {
    total_exceptions: number;
    warnings: number;
    bonus_reduction: number;
    recommendation: string;
  };
}

interface AttendanceExceptions {
  total_exceptions: number;
  warnings: number;
  justified: number;
  high_severity: number;
  unauthorized_absences: number;
  late_arrivals: number;
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
  private pool: Pool | null = null;

  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });
    }
  }

  async getAttendanceExceptions(employeeId: string, startDate: string, endDate: string): Promise<AttendanceExceptions> {
    if (!this.pool) {
      return {
        total_exceptions: 0,
        warnings: 0,
        justified: 0,
        high_severity: 0,
        unauthorized_absences: 0,
        late_arrivals: 0
      };
    }

    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_exceptions,
          SUM(CASE WHEN review_status = 'WARNING_ISSUED' THEN 1 ELSE 0 END) as warnings,
          SUM(CASE WHEN review_status = 'JUSTIFIED' THEN 1 ELSE 0 END) as justified,
          SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
          SUM(CASE WHEN exception_type = 'UNAUTHORIZED_ABSENCE' THEN 1 ELSE 0 END) as unauthorized_absences,
          SUM(CASE WHEN exception_type = 'LATE_ARRIVAL' THEN 1 ELSE 0 END) as late_arrivals
        FROM attendance_exceptions 
        WHERE employee_id = $1 
          AND exception_date BETWEEN $2 AND $3
      `, [employeeId, startDate, endDate]);
      
      return {
        total_exceptions: parseInt(result.rows[0].total_exceptions) || 0,
        warnings: parseInt(result.rows[0].warnings) || 0,
        justified: parseInt(result.rows[0].justified) || 0,
        high_severity: parseInt(result.rows[0].high_severity) || 0,
        unauthorized_absences: parseInt(result.rows[0].unauthorized_absences) || 0,
        late_arrivals: parseInt(result.rows[0].late_arrivals) || 0
      };
    } catch (error) {
      console.error('Error fetching attendance exceptions:', error);
      return {
        total_exceptions: 0,
        warnings: 0,
        justified: 0,
        high_severity: 0,
        unauthorized_absences: 0,
        late_arrivals: 0
      };
    }
  }

  calculateAttendanceBonus(exceptions: AttendanceExceptions): number {
    let bonusPercentage = 100;
    
    if (exceptions.warnings > 0) {
      bonusPercentage -= (exceptions.warnings * 25);
    }
    
    if (exceptions.unauthorized_absences > 0) {
      bonusPercentage = 0;
    }
    
    if (exceptions.high_severity > 0) {
      bonusPercentage -= (exceptions.high_severity * 10);
    }
    
    if (exceptions.late_arrivals > 5) {
      bonusPercentage -= 15;
    }
    
    return Math.max(0, bonusPercentage);
  }

  generatePayrollRecommendation(exceptions: AttendanceExceptions): string {
    if (exceptions.unauthorized_absences > 0) {
      return 'No attendance bonus due to unauthorized absences';
    }
    if (exceptions.warnings >= 3) {
      return 'Attendance improvement plan recommended';
    }
    if (exceptions.warnings >= 1) {
      return 'Partial attendance bonus due to warnings';
    }
    return 'Full attendance bonus eligible';
  }

  /**
   * Calculate gross salary with optional attendance integration
   */
  async calculateGrossSalary(
    employee: Employee, 
    attendance: AttendanceData,
    payrollPeriod?: { start_date: string; end_date: string }
  ): Promise<GrossSalaryBreakdown> {
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

    // Calculate attendance bonus if payroll period provided
    let attendanceBonus = 0;
    let attendanceBonusPercentage = 100;
    let attendanceImpact = undefined;

    if (payrollPeriod && this.pool) {
      try {
        const exceptions = await this.getAttendanceExceptions(
          employee.id,
          payrollPeriod.start_date,
          payrollPeriod.end_date
        );
        
        attendanceBonusPercentage = this.calculateAttendanceBonus(exceptions);
        const baseAttendanceBonus = baseSalary * 0.1;
        attendanceBonus = baseAttendanceBonus * (attendanceBonusPercentage / 100);
        
        attendanceImpact = {
          total_exceptions: exceptions.total_exceptions,
          warnings: exceptions.warnings,
          bonus_reduction: 100 - attendanceBonusPercentage,
          recommendation: this.generatePayrollRecommendation(exceptions)
        };
      } catch (error) {
        console.error('Error calculating attendance bonus:', error);
      }
    }

    // Calculate gross salary with attendance bonus
    const grossSalary = baseSalary + allowances + overtimePay + nightShiftDifferential + hazardPay + attendanceBonus;

    const result: GrossSalaryBreakdown = {
      base_salary: Math.round(baseSalary * 100) / 100,
      allowances: Math.round(allowances * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      night_shift_differential: Math.round(nightShiftDifferential * 100) / 100,
      hazard_pay: Math.round(hazardPay * 100) / 100,
      gross_salary: Math.round(grossSalary * 100) / 100,
    };

    if (payrollPeriod) {
      result.attendance_bonus = Math.round(attendanceBonus * 100) / 100;
      result.attendance_bonus_percentage = attendanceBonusPercentage;
      result.attendance_impact = attendanceImpact;
    }

    return result;
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

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
