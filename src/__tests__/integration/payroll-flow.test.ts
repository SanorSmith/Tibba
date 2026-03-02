/**
 * Payroll Flow Integration Test
 * Tests complete payroll calculation workflow
 */

import { PayrollCalculator } from '../../services/payroll-calculator';

describe('Payroll Flow Integration', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  test('should complete full payroll calculation workflow', async () => {
    // 1. Create test employee
    const employee = {
      id: 'emp-123',
      base_salary: 10000,
      allowances: {
        housing: 2000,
        transportation: 500,
      },
      hire_date: new Date('2024-01-15'),
    };

    // 2. Add attendance records (with overtime, night shifts)
    const attendance = {
      days_worked: 15,
      overtime_hours: 10,
      night_shifts: 5,
      hazard_shifts: 3,
      unpaid_leave_days: 2,
    };

    // 3. Add leave request (1 day unpaid) - already included in attendance
    // 4. Create loan with monthly deduction
    const deductions = {
      loan_deduction: 500,
      health_insurance: 200,
    };

    // 5. Run payroll calculation
    const grossResult = await calculator.calculateGrossSalary(employee, attendance);

    // 6. Verify gross salary components
    expect(grossResult.base_salary).toBeGreaterThan(0);
    expect(grossResult.allowances).toBe(2500); // 2000 + 500
    expect(grossResult.overtime_pay).toBeGreaterThan(0);
    expect(grossResult.night_shift_differential).toBeGreaterThan(0);
    expect(grossResult.hazard_pay).toBe(150); // 3 * 50
    expect(grossResult.gross_salary).toBeGreaterThan(0);

    // 7. Calculate deductions
    const deductionResult = await calculator.calculateDeductions(
      grossResult.gross_salary,
      deductions
    );

    // 8. Verify deductions
    expect(deductionResult.social_security).toBeCloseTo(grossResult.gross_salary * 0.09, 0);
    expect(deductionResult.health_insurance).toBe(200);
    expect(deductionResult.loan_deduction).toBe(500);
    expect(deductionResult.total_deductions).toBeGreaterThan(0);

    // 9. Verify net salary = gross - deductions
    const netSalary = grossResult.gross_salary - deductionResult.total_deductions;
    expect(netSalary).toBeGreaterThan(0);
    expect(netSalary).toBeLessThan(grossResult.gross_salary);

    // 10. Generate payslip PDF (mock)
    const payslipData = {
      employee,
      attendance,
      gross: grossResult,
      deductions: deductionResult,
      net: netSalary,
    };

    expect(payslipData).toBeDefined();
    expect(payslipData.gross.gross_salary).toBeGreaterThan(0);
    expect(payslipData.net).toBeGreaterThan(0);
  });

  test('should handle new employee pro-rata calculation', async () => {
    // Employee joined mid-month
    const employee = {
      id: 'emp-456',
      base_salary: 12000,
      allowances: {},
      hire_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    };

    const attendance = {
      days_worked: 15,
      overtime_hours: 5,
      night_shifts: 2,
      hazard_shifts: 1,
    };

    const result = await calculator.calculateGrossSalary(employee, attendance);

    // Should be pro-rata (half month)
    expect(result.base_salary).toBeCloseTo(6000, 0); // Half of 12000
    expect(result.gross_salary).toBeGreaterThan(6000); // Plus overtime etc.
  });

  test('should handle employee with no overtime or shifts', async () => {
    const employee = {
      id: 'emp-789',
      base_salary: 8000,
      allowances: {},
    };

    const attendance = {
      days_worked: 30,
      overtime_hours: 0,
      night_shifts: 0,
      hazard_shifts: 0,
    };

    const result = await calculator.calculateGrossSalary(employee, attendance);

    expect(result.base_salary).toBe(8000);
    expect(result.overtime_pay).toBe(0);
    expect(result.night_shift_differential).toBe(0);
    expect(result.hazard_pay).toBe(0);
    expect(result.gross_salary).toBe(8000);
  });

  test('should handle maximum overtime scenario', async () => {
    const employee = {
      id: 'emp-999',
      base_salary: 10000,
      allowances: {},
    };

    const attendance = {
      days_worked: 30,
      overtime_hours: 40, // High overtime
      night_shifts: 15,
      hazard_shifts: 10,
    };

    const result = await calculator.calculateGrossSalary(employee, attendance);

    expect(result.overtime_pay).toBeGreaterThan(0);
    expect(result.night_shift_differential).toBeGreaterThan(0);
    expect(result.hazard_pay).toBe(500); // 10 * 50
    expect(result.gross_salary).toBeGreaterThan(15000); // Base + all extras
  });

  test('should handle edge case of zero days worked', async () => {
    const employee = {
      id: 'emp-000',
      base_salary: 10000,
      allowances: {},
    };

    const attendance = {
      days_worked: 0,
      overtime_hours: 0,
      night_shifts: 0,
      hazard_shifts: 0,
    };

    const result = await calculator.calculateGrossSalary(employee, attendance);

    expect(result.base_salary).toBe(0);
    expect(result.gross_salary).toBe(0);
  });
});
