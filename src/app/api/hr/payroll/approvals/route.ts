import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const result = await pool.query(`
      SELECT 
        pa.id,
        pa.period_id,
        pa.step_number,
        pa.approver_role,
        pa.approver_name,
        pa.status,
        pa.comments,
        pa.approved_at,
        pa.created_at,
        pp.period_name,
        pp.start_date,
        pp.end_date,
        pp.total_employees as employee_count,
        pp.total_gross as gross_total,
        pp.total_net as net_total,
        pp.total_deductions as deductions_total
      FROM payroll_approvals pa
      JOIN payroll_periods pp ON pa.period_id = pp.id
      WHERE pa.status = $1
      ORDER BY pa.created_at DESC
    `, [status]);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });

  } catch (error: any) {
    console.error('Approvals GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id } = body;

    if (!period_id) {
      return NextResponse.json({ error: 'period_id is required' }, { status: 400 });
    }

    // Check if approval already exists for this period
    const existing = await pool.query(
      `SELECT id FROM payroll_approvals WHERE period_id = $1 AND status = 'PENDING'`,
      [period_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Approval already pending for this period' }, { status: 409 });
    }

    // Create approval workflow steps
    const steps = [
      { step: 1, role: 'HR Manager' },
      { step: 2, role: 'CFO' },
      { step: 3, role: 'CEO' },
    ];

    const insertedIds: string[] = [];

    for (const s of steps) {
      const result = await pool.query(`
        INSERT INTO payroll_approvals (period_id, step_number, approver_role, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [period_id, s.step, s.role, s.step === 1 ? 'PENDING' : 'WAITING']);

      insertedIds.push(result.rows[0].id);
    }

    // Update period status
    await pool.query(
      `UPDATE payroll_periods SET status = 'PENDING_APPROVAL' WHERE id = $1`,
      [period_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Approval workflow created',
      approval_ids: insertedIds,
    });

  } catch (error: any) {
    console.error('Approvals POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { approval_id, action, comments, approver_name } = body;

    if (!approval_id || !action) {
      return NextResponse.json({ error: 'approval_id and action are required' }, { status: 400 });
    }

    if (action === 'approve') {
      // Update current step
      await pool.query(`
        UPDATE payroll_approvals 
        SET status = 'APPROVED', comments = $2, approved_at = NOW(), approver_name = $3, updated_at = NOW()
        WHERE id = $1
      `, [approval_id, comments || '', approver_name || 'System']);

      // Get current step info
      const current = await pool.query(
        `SELECT period_id, step_number FROM payroll_approvals WHERE id = $1`,
        [approval_id]
      );

      if (current.rows.length > 0) {
        const { period_id, step_number } = current.rows[0];

        // Activate next step
        const nextStep = await pool.query(`
          UPDATE payroll_approvals 
          SET status = 'PENDING', updated_at = NOW()
          WHERE period_id = $1 AND step_number = $2 AND status = 'WAITING'
          RETURNING id
        `, [period_id, step_number + 1]);

        // If no next step, mark period as approved
        if (nextStep.rows.length === 0) {
          await pool.query(
            `UPDATE payroll_periods SET status = 'APPROVED' WHERE id = $1`,
            [period_id]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Step approved' });

    } else if (action === 'reject') {
      // Update current step
      await pool.query(`
        UPDATE payroll_approvals 
        SET status = 'REJECTED', comments = $2, approved_at = NOW(), approver_name = $3, updated_at = NOW()
        WHERE id = $1
      `, [approval_id, comments || '', approver_name || 'System']);

      // Get period_id
      const current = await pool.query(
        `SELECT period_id FROM payroll_approvals WHERE id = $1`,
        [approval_id]
      );

      if (current.rows.length > 0) {
        // Reset period status
        await pool.query(
          `UPDATE payroll_periods SET status = 'REJECTED' WHERE id = $1`,
          [current.rows[0].period_id]
        );
      }

      return NextResponse.json({ success: true, message: 'Step rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Approvals PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
