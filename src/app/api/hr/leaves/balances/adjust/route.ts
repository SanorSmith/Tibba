import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Adjusting a balance credits or debits leave days, so it must be limited
  // to the caller's own facility.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

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
    const { employee_id, leave_type_id, adjustment_days, reason, year } = body;

    if (!employee_id || !leave_type_id || adjustment_days === undefined || !reason || !year) {
      await pool.end();
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, leave_type_id, adjustment_days, reason, year' },
        { status: 400 }
      );
    }

    // Get current balance
    const currentBalance = await pool.query(`
      SELECT * FROM leave_balance 
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
        AND workspaceid = $4
    `, [employee_id, leave_type_id, year, workspaceId]);

    if (currentBalance.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'Balance record not found for this employee and leave type' },
        { status: 404 }
      );
    }

    const balance = currentBalance.rows[0];

    // Calculate new values
    const newAccrued = Math.max(0, (balance.accrued || 0) + adjustment_days);
    const newClosingBalance = Math.max(0, (balance.available_balance || 0) + adjustment_days);

    // Update balance
    const result = await pool.query(`
      UPDATE leave_balance 
      SET 
        accrued = $1,
        available_balance = $2,
        updated_at = NOW()
      WHERE employee_id = $3 AND leave_type_id = $4 AND year = $5
        AND workspaceid = $6
      RETURNING *
    `, [newAccrued, newClosingBalance, employee_id, leave_type_id, year, workspaceId]);

    // Create transaction record for audit trail
    await pool.query(`
      INSERT INTO leave_transactions (
        employee_id, leave_type_id, transaction_type, transaction_date,
        days, description
      ) VALUES ($1, $2, 'ADJUSTMENT', CURRENT_DATE, $3, $4)
    `, [employee_id, leave_type_id, adjustment_days, reason]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error adjusting leave balance:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to adjust leave balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
