import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface LeavePayCalculation {
  employee_id: string;
  leave_request_id: string;
  leave_type: string;
  is_paid: boolean;
  total_days: number;
  working_days: number;
  paid_days: number;
  unpaid_days: number;
  daily_rate: number;
  total_pay: number;
  deduction_amount: number;
  net_impact: number;
}

export interface PayrollAdjustment {
  employee_id: string;
  payroll_period: string;
  adjustment_type: 'LEAVE_PAY' | 'LEAVE_DEDUCTION';
  amount: number;
  leave_request_id: string;
  description: string;
}

// =====================================================
// CALCULATE LEAVE PAY IMPACT
// =====================================================

export async function calculateLeavePayImpact(
  leaveRequestId: string
): Promise<LeavePayCalculation> {
  try {
    // Get leave request details
    const leaveResult = await pool.query(
      `SELECT 
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lr.leave_type_code,
        lt.name as leave_type_name,
        lt.is_paid,
        lr.start_date,
        lr.end_date,
        lr.days_count,
        lr.working_days_count
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.id = $1`,
      [leaveRequestId]
    );

    if (leaveResult.rows.length === 0) {
      throw new Error('Leave request not found');
    }

    const leave = leaveResult.rows[0];

    // Get employee salary information
    const empResult = await pool.query(
      `SELECT 
        staffid,
        firstname,
        lastname,
        salary,
        salary_type
       FROM staff
       WHERE staffid = $1`,
      [leave.employee_id]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = empResult.rows[0];

    // Calculate daily rate
    let dailyRate = 0;
    if (employee.salary && employee.salary_type) {
      if (employee.salary_type === 'MONTHLY') {
        dailyRate = parseFloat(employee.salary) / 30;
      } else if (employee.salary_type === 'ANNUAL') {
        dailyRate = parseFloat(employee.salary) / 365;
      } else if (employee.salary_type === 'DAILY') {
        dailyRate = parseFloat(employee.salary);
      }
    }

    // Calculate paid vs unpaid days
    let paidDays = 0;
    let unpaidDays = 0;

    if (leave.is_paid) {
      // Check leave balance
      const balanceResult = await pool.query(
        `SELECT available_balance
         FROM leave_balance
         WHERE employee_id = $1
         AND leave_type_id = $2
         AND year = EXTRACT(YEAR FROM $3::date)`,
        [leave.employee_id, leave.leave_type_id, leave.start_date]
      );

      if (balanceResult.rows.length > 0) {
        const availableBalance = parseFloat(balanceResult.rows[0].available_balance);
        paidDays = Math.min(leave.working_days_count, availableBalance);
        unpaidDays = Math.max(0, leave.working_days_count - availableBalance);
      } else {
        // No balance record - treat as unpaid
        unpaidDays = leave.working_days_count;
      }
    } else {
      // Unpaid leave type
      unpaidDays = leave.working_days_count;
    }

    // Calculate amounts
    const totalPay = paidDays * dailyRate;
    const deductionAmount = unpaidDays * dailyRate;
    const netImpact = totalPay - deductionAmount;

    const calculation: LeavePayCalculation = {
      employee_id: leave.employee_id,
      leave_request_id: leaveRequestId,
      leave_type: leave.leave_type_name,
      is_paid: leave.is_paid,
      total_days: leave.days_count,
      working_days: leave.working_days_count,
      paid_days: paidDays,
      unpaid_days: unpaidDays,
      daily_rate: dailyRate,
      total_pay: totalPay,
      deduction_amount: deductionAmount,
      net_impact: netImpact,
    };

    return calculation;

  } catch (error: any) {
    console.error('❌ Error calculating leave pay impact:', error);
    throw error;
  }
}

// =====================================================
// CREATE PAYROLL ADJUSTMENT
// =====================================================

export async function createPayrollAdjustment(
  leaveRequestId: string,
  payrollPeriod: string
): Promise<PayrollAdjustment | null> {
  try {
    const calculation = await calculateLeavePayImpact(leaveRequestId);

    // Only create adjustment if there's a deduction
    if (calculation.unpaid_days === 0) {
      return null;
    }

    const adjustment: PayrollAdjustment = {
      employee_id: calculation.employee_id,
      payroll_period: payrollPeriod,
      adjustment_type: 'LEAVE_DEDUCTION',
      amount: -calculation.deduction_amount,
      leave_request_id: leaveRequestId,
      description: `Unpaid leave deduction: ${calculation.unpaid_days} day(s) @ ${calculation.daily_rate.toFixed(2)}/day`,
    };

    // Store in database (if payroll_adjustments table exists)
    try {
      await pool.query(
        `INSERT INTO payroll_adjustments (
          employee_id,
          payroll_period,
          adjustment_type,
          amount,
          leave_request_id,
          description,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          adjustment.employee_id,
          adjustment.payroll_period,
          adjustment.adjustment_type,
          adjustment.amount,
          adjustment.leave_request_id,
          adjustment.description,
        ]
      );
    } catch (dbError) {
      console.log('Note: payroll_adjustments table may not exist yet');
    }

    return adjustment;

  } catch (error: any) {
    console.error('❌ Error creating payroll adjustment:', error);
    throw error;
  }
}

// =====================================================
// CALCULATE MONTHLY LEAVE ACCRUAL
// =====================================================

export async function calculateMonthlyAccrual(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    // Get leave type accrual settings
    const leaveTypeResult = await pool.query(
      `SELECT 
        accrual_frequency,
        accrual_rate,
        max_days_per_year
       FROM leave_types
       WHERE id = $1`,
      [leaveTypeId]
    );

    if (leaveTypeResult.rows.length === 0) {
      return 0;
    }

    const leaveType = leaveTypeResult.rows[0];

    // Calculate accrual based on frequency
    let accrualAmount = 0;

    if (leaveType.accrual_frequency === 'MONTHLY') {
      accrualAmount = parseFloat(leaveType.accrual_rate);
    } else if (leaveType.accrual_frequency === 'YEARLY') {
      // Accrue full amount in January
      if (month === 1) {
        accrualAmount = parseFloat(leaveType.max_days_per_year);
      }
    } else if (leaveType.accrual_frequency === 'QUARTERLY') {
      // Accrue quarterly (Jan, Apr, Jul, Oct)
      if ([1, 4, 7, 10].includes(month)) {
        accrualAmount = parseFloat(leaveType.max_days_per_year) / 4;
      }
    }

    return accrualAmount;

  } catch (error: any) {
    console.error('❌ Error calculating monthly accrual:', error);
    return 0;
  }
}

// =====================================================
// PROCESS MONTHLY ACCRUAL FOR EMPLOYEE
// =====================================================

export async function processMonthlyAccrualForEmployee(
  employeeId: string,
  year: number,
  month: number
): Promise<{
  employee_id: string;
  accruals: Array<{ leave_type: string; amount: number }>;
  total_accrued: number;
}> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all active leave types
    const leaveTypesResult = await client.query(
      `SELECT id, name, code FROM leave_types WHERE is_active = true`
    );

    const accruals: Array<{ leave_type: string; amount: number }> = [];
    let totalAccrued = 0;

    for (const leaveType of leaveTypesResult.rows) {
      const accrualAmount = await calculateMonthlyAccrual(
        employeeId,
        leaveType.id,
        year,
        month
      );

      if (accrualAmount > 0) {
        // Update leave balance
        await client.query(
          `INSERT INTO leave_balance (
            employee_id,
            leave_type_id,
            year,
            accrued,
            last_accrual_date
          ) VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (employee_id, leave_type_id, year)
          DO UPDATE SET
            accrued = leave_balance.accrued + $4,
            last_accrual_date = NOW(),
            updated_at = NOW()`,
          [employeeId, leaveType.id, year, accrualAmount]
        );

        accruals.push({
          leave_type: leaveType.name,
          amount: accrualAmount,
        });

        totalAccrued += accrualAmount;
      }
    }

    await client.query('COMMIT');

    return {
      employee_id: employeeId,
      accruals,
      total_accrued: totalAccrued,
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error processing monthly accrual:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// PROCESS MONTHLY ACCRUAL FOR ALL EMPLOYEES
// =====================================================

export async function processMonthlyAccrualForAll(
  year?: number,
  month?: number
): Promise<{
  success: boolean;
  employees_processed: number;
  total_accrued: number;
  errors: string[];
}> {
  try {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    // Get all active employees
    const employeesResult = await pool.query(
      `SELECT staffid FROM staff WHERE status = 'ACTIVE'`
    );

    const summary = {
      success: true,
      employees_processed: 0,
      total_accrued: 0,
      errors: [] as string[],
    };

    for (const employee of employeesResult.rows) {
      try {
        const result = await processMonthlyAccrualForEmployee(
          employee.staffid,
          targetYear,
          targetMonth
        );

        summary.employees_processed++;
        summary.total_accrued += result.total_accrued;

      } catch (error: any) {
        summary.errors.push(`Employee ${employee.staffid}: ${error.message}`);
      }
    }

    console.log(`✅ Monthly accrual completed:`, summary);

    return summary;

  } catch (error: any) {
    console.error('❌ Error processing monthly accrual for all:', error);
    return {
      success: false,
      employees_processed: 0,
      total_accrued: 0,
      errors: [error.message],
    };
  }
}

// =====================================================
// GET LEAVE PAY SUMMARY FOR PAYROLL PERIOD
// =====================================================

export async function getLeavePaySummaryForPeriod(
  startDate: string,
  endDate: string
): Promise<Array<{
  employee_id: string;
  employee_name: string;
  total_leave_days: number;
  paid_days: number;
  unpaid_days: number;
  total_deduction: number;
}>> {
  try {
    const result = await pool.query(
      `SELECT 
        lr.employee_id,
        lr.employee_name,
        SUM(lr.working_days_count) as total_leave_days,
        lt.is_paid
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.status = 'APPROVED'
       AND (
         (lr.start_date BETWEEN $1 AND $2)
         OR (lr.end_date BETWEEN $1 AND $2)
         OR (lr.start_date <= $1 AND lr.end_date >= $2)
       )
       GROUP BY lr.employee_id, lr.employee_name, lt.is_paid
       ORDER BY lr.employee_name`,
      [startDate, endDate]
    );

    const summary = [];

    for (const row of result.rows) {
      const calculation = {
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        total_leave_days: parseInt(row.total_leave_days),
        paid_days: row.is_paid ? parseInt(row.total_leave_days) : 0,
        unpaid_days: row.is_paid ? 0 : parseInt(row.total_leave_days),
        total_deduction: 0,
      };

      // Calculate deduction for unpaid days
      if (calculation.unpaid_days > 0) {
        const empResult = await pool.query(
          `SELECT salary, salary_type FROM staff WHERE staffid = $1`,
          [row.employee_id]
        );

        if (empResult.rows.length > 0) {
          const emp = empResult.rows[0];
          let dailyRate = 0;

          if (emp.salary_type === 'MONTHLY') {
            dailyRate = parseFloat(emp.salary) / 30;
          } else if (emp.salary_type === 'ANNUAL') {
            dailyRate = parseFloat(emp.salary) / 365;
          }

          calculation.total_deduction = calculation.unpaid_days * dailyRate;
        }
      }

      summary.push(calculation);
    }

    return summary;

  } catch (error: any) {
    console.error('❌ Error getting leave pay summary:', error);
    return [];
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  calculateLeavePayImpact,
  createPayrollAdjustment,
  calculateMonthlyAccrual,
  processMonthlyAccrualForEmployee,
  processMonthlyAccrualForAll,
  getLeavePaySummaryForPeriod,
};
