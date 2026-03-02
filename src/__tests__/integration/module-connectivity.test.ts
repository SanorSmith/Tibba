/**
 * Module Connectivity Integration Tests
 * Tests data flow between Attendance → Payroll, Leave → Payroll, Shift → Attendance → Payroll
 */

import { PayrollCalculator } from '../../services/payroll-calculator';

describe('Module Connectivity Integration', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  describe('Attendance → Payroll Integration', () => {
    test('should feed attendance data into payroll calculation', async () => {
      // Step 1: Create employee
      const employee = {
        id: 'emp-001',
        base_salary: 10000,
        allowances: {},
      };

      // Step 2: Add attendance records (20 days worked)
      const attendance = {
        days_worked: 20,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      // Step 3: Run payroll
      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Step 4: Verify attendance data flows to payroll
      expect(result.base_salary).toBeGreaterThan(0);
      expect(result.gross_salary).toBeGreaterThan(0);
    });

    test('should include overtime in payroll when attendance has overtime', async () => {
      const employee = {
        id: 'emp-002',
        base_salary: 10000,
        allowances: {},
      };

      // Add attendance with 10 hours overtime
      const attendance = {
        days_worked: 20,
        overtime_hours: 10,
        night_shifts: 0,
        hazard_shifts: 0,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify overtime pay is calculated
      expect(result.overtime_pay).toBeGreaterThan(0);
      expect(result.gross_salary).toBeGreaterThan(result.base_salary);
    });

    test('should add night differential when attendance has night shifts', async () => {
      const employee = {
        id: 'emp-003',
        base_salary: 10000,
        allowances: {},
      };

      // Add attendance with 5 night shifts
      const attendance = {
        days_worked: 20,
        overtime_hours: 0,
        night_shifts: 5,
        hazard_shifts: 0,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify night shift differential is added
      expect(result.night_shift_differential).toBeGreaterThan(0);
      expect(result.gross_salary).toBeGreaterThan(result.base_salary);
    });

    test('should apply absence deduction when marked absent', async () => {
      const employee = {
        id: 'emp-004',
        base_salary: 10000,
        allowances: {},
      };

      // Employee worked only 18 days (2 days absent)
      const attendance = {
        days_worked: 18,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
        unpaid_leave_days: 2,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify absence deduction applied
      expect(result.base_salary).toBeLessThan(10000);
      expect(result.base_salary).toBeCloseTo(9333.33, 0); // 10000 - (10000/30 * 2)
    });
  });

  describe('Leave → Payroll Integration', () => {
    test('should reduce salary for unpaid leave', async () => {
      const employee = {
        id: 'emp-005',
        base_salary: 12000,
        allowances: {},
      };

      // Employee took 3 days unpaid leave
      const attendance = {
        days_worked: 27,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
        unpaid_leave_days: 3,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify salary is prorated
      const dailyRate = 12000 / 30;
      const expectedDeduction = dailyRate * 3;
      expect(result.base_salary).toBeCloseTo(12000 - expectedDeduction, 0);
    });

    test('should prorate salary for approved unpaid leave', async () => {
      const employee = {
        id: 'emp-006',
        base_salary: 15000,
        allowances: {},
      };

      // 5 days unpaid leave approved
      const attendance = {
        days_worked: 25,
        overtime_hours: 0,
        night_shifts: 0,
        hazard_shifts: 0,
        unpaid_leave_days: 5,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify prorated salary
      expect(result.base_salary).toBe(12500); // 15000 - (15000/30 * 5)
    });
  });

  describe('Shift → Attendance → Payroll Integration', () => {
    test('should capture shift type in attendance and calculate night pay', async () => {
      const employee = {
        id: 'emp-007',
        base_salary: 10000,
        allowances: {},
      };

      // Assign night shift → Check-in → Attendance records shift_type='night'
      const attendance = {
        days_worked: 20,
        overtime_hours: 0,
        night_shifts: 8, // 8 night shifts recorded
        hazard_shifts: 0,
      };

      // Run payroll
      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify night pay added
      expect(result.night_shift_differential).toBeGreaterThan(0);
      
      // Night differential should be 30% of hourly rate * 8 hours * 8 shifts
      const hourlyRate = 10000 / 20 / 8;
      const expectedNightPay = hourlyRate * 0.30 * 8 * 8;
      expect(result.night_shift_differential).toBeCloseTo(expectedNightPay, 0);
    });

    test('should handle mixed shift types in attendance', async () => {
      const employee = {
        id: 'emp-008',
        base_salary: 10000,
        allowances: {},
      };

      // Mix of day and night shifts
      const attendance = {
        days_worked: 20,
        overtime_hours: 5,
        night_shifts: 4,
        hazard_shifts: 2,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify all components calculated
      expect(result.base_salary).toBe(10000);
      expect(result.overtime_pay).toBeGreaterThan(0);
      expect(result.night_shift_differential).toBeGreaterThan(0);
      expect(result.hazard_pay).toBe(100); // 2 * 50
    });
  });

  describe('Complete Integration Flow', () => {
    test('should handle complete employee work cycle', async () => {
      // New employee hired
      const employee = {
        id: 'emp-009',
        base_salary: 12000,
        allowances: {
          housing: 2000,
          transportation: 500,
        },
      };

      // Month's attendance:
      // - 22 days worked
      // - 3 days overtime (8 hours)
      // - 5 night shifts
      // - 2 hazard shifts
      // - 2 days unpaid leave
      const attendance = {
        days_worked: 22,
        overtime_hours: 8,
        night_shifts: 5,
        hazard_shifts: 2,
        unpaid_leave_days: 2,
      };

      // Calculate gross salary
      const grossResult = await calculator.calculateGrossSalary(employee, attendance);

      // Verify all components
      expect(grossResult.base_salary).toBeCloseTo(11200, 0); // 12000 - (12000/30 * 2)
      expect(grossResult.allowances).toBe(2500);
      expect(grossResult.overtime_pay).toBeGreaterThan(0);
      expect(grossResult.night_shift_differential).toBeGreaterThan(0);
      expect(grossResult.hazard_pay).toBe(100);
      expect(grossResult.gross_salary).toBeGreaterThan(13800);

      // Calculate deductions
      const deductions = {
        health_insurance: 200,
        loan_deduction: 500,
      };

      const deductionResult = await calculator.calculateDeductions(
        grossResult.gross_salary,
        deductions
      );

      // Verify deductions
      expect(deductionResult.social_security).toBeCloseTo(grossResult.gross_salary * 0.09, 0);
      expect(deductionResult.health_insurance).toBe(200);
      expect(deductionResult.loan_deduction).toBe(500);
      expect(deductionResult.total_deductions).toBeGreaterThan(0);

      // Calculate net salary
      const netSalary = grossResult.gross_salary - deductionResult.total_deductions;
      expect(netSalary).toBeGreaterThan(0);
      expect(netSalary).toBeLessThan(grossResult.gross_salary);
    });

    test('should handle edge case: employee with maximum benefits', async () => {
      const employee = {
        id: 'emp-010',
        base_salary: 20000,
        allowances: {
          housing: 3000,
          transportation: 1000,
          meal: 500,
        },
      };

      const attendance = {
        days_worked: 30,
        overtime_hours: 20, // High overtime
        night_shifts: 10,
        hazard_shifts: 15,
      };

      const result = await calculator.calculateGrossSalary(employee, attendance);

      // Verify all maximums calculated correctly
      expect(result.base_salary).toBe(20000);
      expect(result.allowances).toBe(4500);
      expect(result.overtime_pay).toBeGreaterThan(0);
      expect(result.night_shift_differential).toBeGreaterThan(0);
      expect(result.hazard_pay).toBe(750); // 15 * 50
      expect(result.gross_salary).toBeGreaterThan(25000);
    });
  });
});
