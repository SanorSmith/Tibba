import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/payroll/advances
 * Get employee advances
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = `
      SELECT 
        ea.*,
        s.firstname || ' ' || COALESCE(s.lastname, '') as employee_name
      FROM employee_advances ea
      LEFT JOIN staff s ON ea.employee_id = s.staffid
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND ea.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ea.status = $${params.length}`;
    }

    query += ` ORDER BY ea.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching advances:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/payroll/advances
 * Create a new advance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      advance_amount,
      deduction_months,
      deduction_start_date,
      reason
    } = body;

    if (!employee_id || !advance_amount || !deduction_months) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate deduction amount per month
    const deduction_amount = advance_amount / deduction_months;

    // Generate advance number
    const advanceNumber = `ADV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const result = await pool.query(`
      INSERT INTO employee_advances (
        employee_id, advance_number, advance_amount,
        deduction_amount, deduction_months, remaining_balance,
        request_date, deduction_start_date, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, 'PENDING')
      RETURNING *
    `, [
      employee_id, advanceNumber, advance_amount,
      deduction_amount, deduction_months, advance_amount,
      deduction_start_date || new Date(), reason
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error creating advance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/payroll/advances
 * Update advance status (approve/reject)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { advance_id, status, approved_by, approval_notes } = body;

    if (!advance_id || !status) {
      return NextResponse.json(
        { success: false, error: 'advance_id and status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      UPDATE employee_advances
      SET 
        status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END,
        approval_notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, approval_notes, advance_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Advance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error updating advance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
