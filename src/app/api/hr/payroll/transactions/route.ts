import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/payroll/transactions
 * Get payroll transactions for a period
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period_id = searchParams.get('period_id');
    const employee_id = searchParams.get('employee_id');
    const status = searchParams.get('status');

    if (!period_id && !employee_id) {
      return NextResponse.json(
        { success: false, error: 'period_id or employee_id is required' },
        { status: 400 }
      );
    }

    let query = `
      SELECT 
        pt.*,
        pp.period_name,
        pp.start_date,
        pp.end_date
      FROM payroll_transactions pt
      LEFT JOIN payroll_periods pp ON pt.period_id = pp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (period_id) {
      params.push(period_id);
      query += ` AND pt.period_id = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      query += ` AND pt.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND pt.status = $${params.length}`;
    }

    query += ` ORDER BY pt.employee_name`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching payroll transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/payroll/transactions
 * Update payroll transaction status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_id, status, approved_by } = body;

    if (!transaction_id || !status) {
      return NextResponse.json(
        { success: false, error: 'transaction_id and status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      UPDATE payroll_transactions
      SET 
        status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, approved_by, transaction_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error updating payroll transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
