import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/payroll/periods
 * Get all payroll periods
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    let query = `
      SELECT 
        id, period_code, period_name, period_type,
        start_date, end_date, payment_date, status,
        total_employees, total_gross, total_deductions, total_net,
        created_at, updated_at
      FROM payroll_periods
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (year) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM start_date) = $${params.length}`;
    }

    query += ` ORDER BY start_date DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching payroll periods:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/payroll/periods
 * Create a new payroll period
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_name, period_code, period_type, start_date, end_date, payment_date } = body;

    if (!period_name || !period_code || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      INSERT INTO payroll_periods (
        period_name, period_code, period_type,
        start_date, end_date, payment_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
      RETURNING *
    `, [period_name, period_code, period_type || 'MONTHLY', start_date, end_date, payment_date]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error creating payroll period:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
