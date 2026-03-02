/**
 * PayrollCalculator Unit Tests
 * Tests for payroll calculation logic including gross salary, deductions, and edge cases
 */

import { PayrollCalculator } from '../payroll-calculator';

describe('PayrollCalculator', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  describe('calculateGrossSalary', () => {
    test('should calculate gross salary for regular employee (base salary only)', async () => {
      const mockEmployee = {
        id: 'emp-1',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(10000);
      expect(result.overtime_pay).toBe(0);
      expect(result.night_shift_differential).toBe(0);
      expect(result.hazard_pay).toBe(0);
      expect(result.gross_salary).toBe(10000);
    });

    test('should calculate gross salary with overtime (10 hours)', async () => {
      const mockEmployee = {
        id: 'emp-2',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 10,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      // Hourly rate = 10000 / 30 / 8 = 41.67
      // OT rate = 41.67 * 1.5 = 62.50
      // OT pay = 62.50 * 10 = 625
      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(10000);
      expect(result.overtime_pay).toBeCloseTo(625, 0);
      expect(result.gross_salary).toBeCloseTo(10625, 0);
    });

    test('should calculate gross salary with night shifts (8 shifts)', async () => {
      const mockEmployee = {
        id: 'emp-3',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 0,
        night_shifts: 8,
        hazard_shifts: 0,
      };

      // Hourly rate = 10000 / 30 / 8 = 41.67
      // Night differential = 41.67 * 0.30 = 12.50 per hour
      // Night pay = 12.50 * 8 hours * 8 shifts = 800
      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(10000);
      expect(result.night_shift_differential).toBeCloseTo(800, 0);
      expect(result.gross_salary).toBeCloseTo(10800, 0);
    });

    test('should calculate gross salary with hazard shifts (15 shifts)', async () => {
      const mockEmployee = {
        id: 'emp-4',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 15,
      };

      // Hazard pay = 50 SAR per shift
      // Total hazard pay = 50 * 15 = 750
      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(10000);
      expect(result.hazard_pay).toBe(750);
      expect(result.gross_salary).toBe(10750);
    });

    test('should calculate pro-rata salary for new employee (15 days)', async () => {
      const mockEmployee = {
        id: 'emp-5',
        base_salary: 10000,
        allowances: {},
        hire_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      };

      const mockAttendance = {
        days_worked: 15,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      // Pro-rata salary = 10000 * (15 / 30) = 5000
      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(5000);
      expect(result.gross_salary).toBe(5000);
    });

    test('should deduct unpaid leave (2 days)', async () => {
      const mockEmployee = {
        id: 'emp-6',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 28,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
        unpaid_leave_days: 2,
      };

      // Daily rate = 10000 / 30 = 333.33
      // Deduction = 333.33 * 2 = 666.67
      // Net base = 10000 - 666.67 = 9333.33
      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBeCloseTo(9333.33, 0);
      expect(result.gross_salary).toBeCloseTo(9333.33, 0);
    });

    test('should calculate combined scenario (OT + night shifts + hazard)', async () => {
      const mockEmployee = {
        id: 'emp-7',
        base_salary: 10000,
        allowances: {
          housing: 2000,
          transportation: 500,
        },
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 10,
        night_shifts: 5,
        hazard_shifts: 10,
      };

      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(10000);
      expect(result.allowances).toBe(2500);
      expect(result.overtime_pay).toBeGreaterThan(0);
      expect(result.night_shift_differential).toBeGreaterThan(0);
      expect(result.hazard_pay).toBe(500);
      expect(result.gross_salary).toBeGreaterThan(13000);
    });
  });

  describe('calculateDeductions', () => {
    test('should calculate social security (9% of gross)', async () => {
      const grossSalary = 10000;

      const result = await calculator.calculateDeductions(grossSalary, {});

      expect(result.social_security).toBe(900); // 9% of 10000
    });

    test('should calculate health insurance deduction', async () => {
      const grossSalary = 10000;
      const deductions = {
        health_insurance: 200,
      };

      const result = await calculator.calculateDeductions(grossSalary, deductions);

      expect(result.health_insurance).toBe(200);
      expect(result.total_deductions).toBe(1100); // 900 SS + 200 insurance
    });

    test('should calculate loan deduction', async () => {
      const grossSalary = 10000;
      const deductions = {
        loan_deduction: 500,
      };

      const result = await calculator.calculateDeductions(grossSalary, deductions);

      expect(result.loan_deduction).toBe(500);
      expect(result.total_deductions).toBe(1400); // 900 SS + 500 loan
    });

    test('should calculate multiple deductions combined', async () => {
      const grossSalary = 10000;
      const deductions = {
        health_insurance: 200,
        loan_deduction: 500,
        advance_deduction: 300,
      };

      const result = await calculator.calculateDeductions(grossSalary, deductions);

      expect(result.social_security).toBe(900);
      expect(result.health_insurance).toBe(200);
      expect(result.loan_deduction).toBe(500);
      expect(result.advance_deduction).toBe(300);
      expect(result.total_deductions).toBe(1900);
    });

    test('should not allow deductions to exceed gross salary', async () => {
      const grossSalary = 1000;
      const deductions = {
        loan_deduction: 2000, // More than gross
      };

      await expect(
        calculator.calculateDeductions(grossSalary, deductions)
      ).rejects.toThrow('Total deductions cannot exceed gross salary');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero hours worked', async () => {
      const mockEmployee = {
        id: 'emp-8',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 0,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      const result = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);

      expect(result.base_salary).toBe(0);
      expect(result.gross_salary).toBe(0);
    });

    test('should reject negative overtime hours', async () => {
      const mockEmployee = {
        id: 'emp-9',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: -5,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      await expect(
        calculator.calculateGrossSalary(mockEmployee, mockAttendance)
      ).rejects.toThrow('Overtime hours cannot be negative');
    });

    test('should reject negative base salary', async () => {
      const mockEmployee = {
        id: 'emp-10',
        base_salary: -10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      await expect(
        calculator.calculateGrossSalary(mockEmployee, mockAttendance)
      ).rejects.toThrow('Base salary cannot be negative');
    });

    test('should handle missing employee data', async () => {
      const mockEmployee = null;
      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      await expect(
        calculator.calculateGrossSalary(mockEmployee as any, mockAttendance)
      ).rejects.toThrow('Employee data is required');
    });

    test('should handle missing attendance records', async () => {
      const mockEmployee = {
        id: 'emp-11',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = null;

      await expect(
        calculator.calculateGrossSalary(mockEmployee, mockAttendance as any)
      ).rejects.toThrow('Attendance data is required');
    });

    test('should calculate net salary correctly', async () => {
      const mockEmployee = {
        id: 'emp-12',
        base_salary: 10000,
        allowances: {},
      };

      const mockAttendance = {
        days_worked: 30,
        overtime_hours: 10,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      const deductions = {
        health_insurance: 200,
        loan_deduction: 500,
      };

      const grossResult = await calculator.calculateGrossSalary(mockEmployee, mockAttendance);
      const deductionResult = await calculator.calculateDeductions(grossResult.gross_salary, deductions);
      
      const netSalary = grossResult.gross_salary - deductionResult.total_deductions;

      expect(netSalary).toBeGreaterThan(0);
      expect(netSalary).toBeLessThan(grossResult.gross_salary);
    });
  });
});
