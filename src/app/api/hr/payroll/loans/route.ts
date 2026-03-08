import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/payroll/loans
 * Get employee loans
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = `
      SELECT 
        el.*,
        s.firstname || ' ' || COALESCE(s.lastname, '') as employee_name
      FROM employee_loans el
      LEFT JOIN staff s ON el.employee_id = s.staffid
      WHERE 1=1
    `;
    const params: any[] = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND el.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND el.status = $${params.length}`;
    }

    query += ` ORDER BY el.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/payroll/loans
 * Create a new loan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      loan_type,
      loan_amount,
      monthly_installment,
      total_installments,
      start_date,
      interest_rate,
      reason
    } = body;

    if (!employee_id || !loan_amount || !monthly_installment || !total_installments) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate loan number
    const loanNumber = `LOAN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const result = await pool.query(`
      INSERT INTO employee_loans (
        employee_id, loan_number, loan_type, loan_amount,
        monthly_installment, total_installments, remaining_balance,
        loan_date, start_date, interest_rate, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, 'PENDING')
      RETURNING *
    `, [
      employee_id, loanNumber, loan_type || 'PERSONAL', loan_amount,
      monthly_installment, total_installments, loan_amount,
      start_date || new Date(), interest_rate || 0, reason
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/payroll/loans
 * Update loan status (approve/reject)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id, status, approved_by, approval_notes } = body;

    if (!loan_id || !status) {
      return NextResponse.json(
        { success: false, error: 'loan_id and status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      UPDATE employee_loans
      SET 
        status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END,
        approval_notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, approval_notes, loan_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
