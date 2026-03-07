import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    if (!employeeId) {
      await pool.end();
      return NextResponse.json(
        { error: 'employeeId parameter is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      SELECT 
        lb.id,
        lb.employee_id,
        lb.leave_type_id,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lt.category,
        lb.year,
        lb.opening_balance,
        lb.accrued,
        lb.used,
        lb.pending,
        lb.carried_forward,
        lb.encashed,
        lb.closing_balance,
        lb.last_accrual_date,
        (lb.closing_balance - lb.pending) as available_balance
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = $2
      ORDER BY lt.name ASC
    `, [employeeId, year]);

    await pool.end();

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching leave balances:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leave balances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'initialize') {
      // Initialize balances for all staff for current year
      const currentYear = new Date().getFullYear();
      
      // Get all active staff
      const staff = await pool.query(`
        SELECT staffid FROM staff
      `);

      // Get all leave types with accrual
      const leaveTypes = await pool.query(`
        SELECT * FROM leave_types 
        WHERE is_active = true AND accrual_method IS NOT NULL
      `);

      let initialized = 0;

      for (const employee of staff.rows) {
        for (const leaveType of leaveTypes.rows) {
          // Check if balance already exists
          const existing = await pool.query(`
            SELECT id FROM leave_balances 
            WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
          `, [employee.staffid, leaveType.id, currentYear]);

          if (existing.rows.length === 0) {
            // Calculate initial accrual
            let initialAccrual = 0;
            if (leaveType.accrual_method === 'ANNUAL') {
              initialAccrual = leaveType.accrual_rate || 0;
            } else if (leaveType.accrual_method === 'MONTHLY') {
              const currentMonth = new Date().getMonth() + 1;
              initialAccrual = (leaveType.accrual_rate || 0) * currentMonth;
            }

            await pool.query(`
              INSERT INTO leave_balances (
                employee_id, leave_type_id, year, opening_balance, accrued,
                closing_balance, last_accrual_date
              ) VALUES ($1, $2, $3, 0, $4, $4, CURRENT_DATE)
            `, [employee.staffid, leaveType.id, currentYear, initialAccrual]);

            initialized++;
          }
        }
      }

      await pool.end();

      return NextResponse.json({
        success: true,
        message: `Initialized ${initialized} leave balances`,
        year: currentYear
      });
    }

    if (action === 'accrual') {
      // Run monthly accrual process
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Get leave types with monthly accrual
      const leaveTypes = await pool.query(`
        SELECT * FROM leave_types 
        WHERE is_active = true AND accrual_method = 'MONTHLY'
      `);

      let accrued = 0;

      for (const leaveType of leaveTypes.rows) {
        const accrualAmount = leaveType.accrual_rate || 0;

        // Update all balances for this leave type
        const result = await pool.query(`
          UPDATE leave_balances 
          SET 
            accrued = accrued + $1,
            closing_balance = closing_balance + $1,
            last_accrual_date = CURRENT_DATE,
            updated_at = NOW()
          WHERE leave_type_id = $2 AND year = $3
          RETURNING employee_id
        `, [accrualAmount, leaveType.id, currentYear]);

        accrued += result.rowCount || 0;

        // Create transaction records
        for (const row of result.rows) {
          await pool.query(`
            INSERT INTO leave_transactions (
              employee_id, leave_type_id, transaction_type, transaction_date,
              days, description
            ) VALUES ($1, $2, 'ACCRUAL', CURRENT_DATE, $3, $4)
          `, [
            row.employee_id,
            leaveType.id,
            accrualAmount,
            `Monthly accrual for ${leaveType.name}`
          ]);
        }
      }

      await pool.end();

      return NextResponse.json({
        success: true,
        message: `Accrued leave for ${accrued} balances`,
        month: currentMonth,
        year: currentYear
      });
    }

    await pool.end();

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: initialize, accrual' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing leave balance action:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to process leave balance action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
