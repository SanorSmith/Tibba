import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { approver_id, comments, action } = body;

    if (!approver_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: approver_id, action' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    // Get leave request details
    const leaveRequest = await pool.query(`
      SELECT * FROM leave_requests WHERE id = $1
    `, [id]);

    if (leaveRequest.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const request_data = leaveRequest.rows[0];

    if (request_data.status !== 'PENDING') {
      await pool.end();
      return NextResponse.json(
        { error: `Leave request is already ${request_data.status}` },
        { status: 400 }
      );
    }

    // Get pending approval for this approver
    const approval = await pool.query(`
      SELECT * FROM leave_approvals 
      WHERE leave_request_id = $1 AND approver_id = $2 AND status = 'PENDING'
      ORDER BY approval_level ASC
      LIMIT 1
    `, [id, approver_id]);

    if (approval.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'No pending approval found for this approver' },
        { status: 400 }
      );
    }

    const approval_data = approval.rows[0];

    // Update approval record
    await pool.query(`
      UPDATE leave_approvals 
      SET status = $1, comments = $2, approved_at = NOW()
      WHERE id = $3
    `, [action === 'APPROVE' ? 'APPROVED' : 'REJECTED', comments || null, approval_data.id]);

    if (action === 'REJECT') {
      // Reject the leave request
      await pool.query(`
        UPDATE leave_requests 
        SET status = 'REJECTED', updated_at = NOW()
        WHERE id = $1
      `, [id]);

      // Release pending balance
      const currentYear = new Date().getFullYear();
      await pool.query(`
        UPDATE leave_balances 
        SET pending = pending - $1, updated_at = NOW()
        WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
      `, [request_data.total_days, request_data.employee_id, request_data.leave_type_id, currentYear]);

      await pool.end();

      return NextResponse.json({
        success: true,
        message: 'Leave request rejected',
        status: 'REJECTED'
      });
    }

    // Check if there are more approval levels
    const nextApproval = await pool.query(`
      SELECT * FROM leave_approvals 
      WHERE leave_request_id = $1 AND approval_level > $2 AND status = 'PENDING'
      ORDER BY approval_level ASC
      LIMIT 1
    `, [id, approval_data.approval_level]);

    if (nextApproval.rows.length > 0) {
      // More approvals needed
      await pool.end();
      return NextResponse.json({
        success: true,
        message: 'Approval recorded. Waiting for next level approval',
        status: 'PENDING',
        next_approver: nextApproval.rows[0].approver_id
      });
    }

    // All approvals complete - approve the request
    await pool.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Update leave balance
    const currentYear = new Date().getFullYear();
    await pool.query(`
      UPDATE leave_balances 
      SET 
        used = used + $1,
        pending = pending - $1,
        closing_balance = closing_balance - $1,
        updated_at = NOW()
      WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
    `, [request_data.total_days, request_data.employee_id, request_data.leave_type_id, currentYear]);

    // Create transaction record
    await pool.query(`
      INSERT INTO leave_transactions (
        employee_id, leave_type_id, leave_request_id, transaction_type,
        transaction_date, days, description, created_by
      ) VALUES ($1, $2, $3, 'USAGE', CURRENT_DATE, $4, $5, $6)
    `, [
      request_data.employee_id,
      request_data.leave_type_id,
      id,
      request_data.total_days,
      `Leave approved: ${request_data.request_number}`,
      approver_id
    ]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      status: 'APPROVED'
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to process approval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
