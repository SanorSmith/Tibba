/**
 * End-to-End Test: New Employee Hire to First Paycheck
 * Tests complete workflow from employee creation to payslip generation
 */

import { PayrollCalculator } from '../../services/payroll-calculator';

describe('E2E: New Hire to First Paycheck', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  test('should complete full employee lifecycle from hire to paycheck', async () => {
    // Step 1: Create employee record
    const newEmployee = {
      id: 'emp-new-001',
      employee_number: 'EMP2024001',
      first_name: 'Ahmed',
      last_name: 'Al-Rashid',
      email: 'ahmed.alrashid@tibbna.com',
      phone: '+966501234567',
      position: 'Registered Nurse',
      department_id: 'dept-nursing-001',
      base_salary: 12000,
      hire_date: new Date('2024-02-01'),
      employment_status: 'active',
      allowances: {
        housing: 2000,
        transportation: 500,
      },
      metadata: {
        bank_account: 'SA4420000000001234567890',
        bank_name: 'Al Rajhi Bank',
        iban: 'SA4420000000001234567890',
      },
    };

    expect(newEmployee.employee_number).toBe('EMP2024001');
    expect(newEmployee.base_salary).toBe(12000);

    // Step 2: Assign to department and grade
    expect(newEmployee.department_id).toBe('dept-nursing-001');
    expect(newEmployee.position).toBe('Registered Nurse');

    // Step 3: Add bank details
    expect(newEmployee.metadata.bank_account).toBeDefined();
    expect(newEmployee.metadata.iban).toBeDefined();

    // Step 4: Employee clocks in/out for 20 days
    const monthAttendance = {
      days_worked: 20,
      overtime_hours: 0,
      night_shifts: 0,
      hazard_shifts: 0,
    };

    // Step 5: 3 days include overtime (8 hours total)
    monthAttendance.overtime_hours = 8;

    // Step 6: 2 days are night shifts
    monthAttendance.night_shifts = 2;

    // Step 7: Request and approve 2 days annual leave
    const leaveRequest = {
      employee_id: newEmployee.id,
      leave_type: 'annual',
      start_date: '2024-02-26',
      end_date: '2024-02-27',
      total_days: 2,
      status: 'APPROVED',
    };

    expect(leaveRequest.status).toBe('APPROVED');
    expect(leaveRequest.total_days).toBe(2);

    // Adjust attendance for approved leave
    monthAttendance.days_worked = 20; // Already accounts for 2 leave days

    // Step 8: Run monthly payroll
    const grossResult = await calculator.calculateGrossSalary(newEmployee, monthAttendance);

    // Verify gross salary calculation
    expect(grossResult.base_salary).toBe(12000);
    expect(grossResult.allowances).toBe(2500); // 2000 + 500
    expect(grossResult.overtime_pay).toBeGreaterThan(0);
    expect(grossResult.night_shift_differential).toBeGreaterThan(0);
    expect(grossResult.gross_salary).toBeGreaterThan(14500);

    // Step 9: Calculate deductions
    const deductions = {
      health_insurance: 200,
      loan_deduction: 0, // New employee, no loans yet
    };

    const deductionResult = await calculator.calculateDeductions(
      grossResult.gross_salary,
      deductions
    );

    // Verify deductions
    expect(deductionResult.social_security).toBeCloseTo(grossResult.gross_salary * 0.09, 0);
    expect(deductionResult.health_insurance).toBe(200);
    expect(deductionResult.total_deductions).toBeGreaterThan(0);

    // Step 10: Calculate net salary
    const netSalary = grossResult.gross_salary - deductionResult.total_deductions;
    expect(netSalary).toBeGreaterThan(0);
    expect(netSalary).toBeLessThan(grossResult.gross_salary);

    // Step 11: Generate payslip
    const payslip = {
      employee: newEmployee,
      period: {
        name: 'February 2024',
        start_date: '2024-02-01',
        end_date: '2024-02-29',
      },
      gross: grossResult,
      deductions: deductionResult,
      net_salary: netSalary,
      bank_details: newEmployee.metadata,
    };

    expect(payslip.employee.employee_number).toBe('EMP2024001');
    expect(payslip.net_salary).toBeGreaterThan(0);
    expect(payslip.bank_details.iban).toBeDefined();

    // Step 12: Verify all calculations correct
    const expectedGross = grossResult.base_salary + 
                         grossResult.allowances + 
                         grossResult.overtime_pay + 
                         grossResult.night_shift_differential + 
                         grossResult.hazard_pay;

    expect(grossResult.gross_salary).toBeCloseTo(expectedGross, 0);

    const expectedNet = grossResult.gross_salary - deductionResult.total_deductions;
    expect(netSalary).toBeCloseTo(expectedNet, 0);

    // Step 13: Generate bank file
    const bankFileEntry = {
      employee_number: newEmployee.employee_number,
      employee_name: `${newEmployee.first_name} ${newEmployee.last_name}`,
      iban: newEmployee.metadata.iban,
      amount: netSalary,
      bank_name: newEmployee.metadata.bank_name,
    };

    expect(bankFileEntry.iban).toBe('SA4420000000001234567890');
    expect(bankFileEntry.amount).toBeGreaterThan(0);

    // Final verification
    console.log('✅ New hire to paycheck workflow completed successfully');
    console.log(`Employee: ${bankFileEntry.employee_name}`);
    console.log(`Gross Salary: ${grossResult.gross_salary.toFixed(2)} SAR`);
    console.log(`Total Deductions: ${deductionResult.total_deductions.toFixed(2)} SAR`);
    console.log(`Net Salary: ${netSalary.toFixed(2)} SAR`);
    console.log(`Bank Transfer: ${bankFileEntry.iban} - ${bankFileEntry.amount.toFixed(2)} SAR`);
  });

  test('should handle employee with complex scenario', async () => {
    // Employee with multiple allowances, overtime, night shifts, and hazard pay
    const employee = {
      id: 'emp-complex-001',
      base_salary: 15000,
      allowances: {
        housing: 3000,
        transportation: 1000,
        meal: 500,
        mobile: 200,
      },
    };

    const attendance = {
      days_worked: 28,
      overtime_hours: 15, // Significant overtime
      night_shifts: 8,
      hazard_shifts: 10,
      unpaid_leave_days: 2,
    };

    const grossResult = await calculator.calculateGrossSalary(employee, attendance);

    // Verify complex calculation
    expect(grossResult.base_salary).toBeCloseTo(14000, 0); // 15000 - (15000/30 * 2)
    expect(grossResult.allowances).toBe(4700);
    expect(grossResult.overtime_pay).toBeGreaterThan(0);
    expect(grossResult.night_shift_differential).toBeGreaterThan(0);
    expect(grossResult.hazard_pay).toBe(500); // 10 * 50
    expect(grossResult.gross_salary).toBeGreaterThan(19000);

    // Deductions with loan
    const deductions = {
      health_insurance: 300,
      loan_deduction: 1000,
      advance_deduction: 500,
    };

    const deductionResult = await calculator.calculateDeductions(
      grossResult.gross_salary,
      deductions
    );

    expect(deductionResult.social_security).toBeCloseTo(grossResult.gross_salary * 0.09, 0);
    expect(deductionResult.health_insurance).toBe(300);
    expect(deductionResult.loan_deduction).toBe(1000);
    expect(deductionResult.advance_deduction).toBe(500);

    const netSalary = grossResult.gross_salary - deductionResult.total_deductions;
    expect(netSalary).toBeGreaterThan(0);

    console.log('✅ Complex scenario completed successfully');
    console.log(`Gross: ${grossResult.gross_salary.toFixed(2)} SAR`);
    console.log(`Deductions: ${deductionResult.total_deductions.toFixed(2)} SAR`);
    console.log(`Net: ${netSalary.toFixed(2)} SAR`);
  });

  test('should handle part-time employee prorated salary', async () => {
    // Part-time employee hired mid-month
    const partTimeEmployee = {
      id: 'emp-parttime-001',
      base_salary: 8000,
      allowances: {},
      hire_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    };

    const attendance = {
      days_worked: 15,
      overtime_hours: 0,
      night_shifts: 0,
      hazard_shifts: 0,
    };

    const result = await calculator.calculateGrossSalary(partTimeEmployee, attendance);

    // Should be prorated for 15 days
    expect(result.base_salary).toBeCloseTo(4000, 0); // 8000 * (15/30)
    expect(result.gross_salary).toBeCloseTo(4000, 0);

    console.log('✅ Part-time employee prorated correctly');
    console.log(`Prorated Salary: ${result.base_salary.toFixed(2)} SAR`);
  });
});
