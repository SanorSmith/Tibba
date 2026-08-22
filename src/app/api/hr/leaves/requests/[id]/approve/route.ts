import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Approving is a write on someone else's leave record, so the request must
  // belong to the approver's facility.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const body = await request.json();
    const { approver_id, approver_name, action, comments } = body;

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
      SELECT * FROM leave_requests WHERE id = $1 AND workspaceid = $2
    `, [id, workspaceId]);

    if (leaveRequest.rows.length === 0) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const request_data = leaveRequest.rows[0];

    // Get pending approval for this approver
    const approval = await pool.query(`
      SELECT * FROM leave_request_approvals 
      WHERE leave_request_id = $1 AND approver_id = $2 AND status = 'PENDING'
      ORDER BY approval_level ASC
      LIMIT 1
    `, [id, approver_id]);

    if (approval.rows.length === 0) {
      return NextResponse.json(
        { error: 'No pending approval found for this approver' },
        { status: 400 }
      );
    }

    const approval_data = approval.rows[0];

    // Update approval record
    await pool.query(`
      UPDATE leave_request_approvals 
      SET status = $1, 
          decision_date = NOW(),
          comments = $2
      WHERE id = $3
    `, [action === 'APPROVE' ? 'APPROVED' : 'REJECTED', comments || null, approval_data.id]);

    if (action === 'REJECT') {
      // Reject the leave request
      await pool.query(`
        UPDATE leave_requests 
        SET status = 'REJECTED', 
            rejection_reason = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [comments || 'Rejected by ' + approver_name, id]);


      return NextResponse.json({
        success: true,
        message: 'Leave request rejected',
        status: 'REJECTED'
      });
    }

    // Check if there are more approval levels
    const nextApproval = await pool.query(`
      SELECT * FROM leave_request_approvals 
      WHERE leave_request_id = $1 AND approval_level > $2 AND status = 'PENDING'
      ORDER BY approval_level ASC
      LIMIT 1
    `, [id, approval_data.approval_level]);

    if (nextApproval.rows.length > 0) {
      // More approvals needed
      return NextResponse.json({
        success: true,
        message: 'Approval recorded. Waiting for next level approval',
        status: 'PENDING',
        next_approver: nextApproval.rows[0].approver_name
      });
    }

    // All approvals complete - approve the request
    await pool.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', 
          approved_by = $1,
          approved_by_name = $2,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [approver_id, approver_name || 'System', id]);


    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      status: 'APPROVED'
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process approval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
