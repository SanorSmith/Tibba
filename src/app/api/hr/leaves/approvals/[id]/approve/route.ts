import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';
import attendanceIntegration from '@/lib/services/attendance-leave-integration';
import { pool, pool as guardPool } from '@/lib/db/pool';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Direct-approval fallback used when a leave request has no approval-workflow rows
 * (e.g. seed data or requests created before the workflow existed).
 * Sets leave_requests.status = 'APPROVED' and records an approval row.
 */
async function directApprove(
  id: string,
  approverId: string,
  approverName: string,
  comments?: string
) {
  try {
    // Mark the request approved
    const upd = await pool.query(
      `UPDATE leave_requests
       SET status = 'APPROVED', approved_by = $2, approved_by_name = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, employee_id, leave_type_code, start_date, end_date, return_date, working_days_count, status`,
      [id, approverId, approverName]
    );
    if (upd.rows.length === 0) throw new Error('Leave request not found');

    // Record an approval row for the audit trail (best-effort)
    try {
      await pool.query(
        `INSERT INTO leave_request_approvals
           (organization_id, leave_request_id, approval_level, level_name, status,
            approver_id, approver_name, decision_date, comments, created_at, updated_at)
         VALUES ($1, $2, 1, 'Direct Approval', 'APPROVED', $3, $4, NOW(), $5, NOW(), NOW())`,
        [ORG_ID, id, approverId, approverName, comments ?? null]
      );
    } catch { /* non-fatal */ }

    // Sync attendance for the approved leave
    try {
      await attendanceIntegration.updateAttendanceForApprovedLeave(upd.rows[0]);
    } catch { /* non-fatal */ }

    return { is_complete: true, final_status: 'APPROVED', message: 'Leave request approved' };
  } finally {
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { approver_id, approver_name, comments } = body;

    if (!approver_id || !approver_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: approver_id, approver_name',
      }, { status: 400 });
    }

    // Approval is delegated to the workflow service and to directApprove(),
    // neither of which knows about facilities, so check ownership here before
    // either path can write.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    {
      try {
        const owns = await guardPool.query(
          'SELECT 1 FROM leave_requests WHERE id = $1 AND workspaceid = $2',
          [id, workspaceId]
        );
        if (owns.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Leave request not found' },
            { status: 404 }
          );
        }
      } finally {
      }
    }

    let result;
    try {
      result = await approvalWorkflow.approveLeaveRequest(
        id,
        approver_id,
        approver_name,
        comments
      );
    } catch (workflowErr: any) {
      // Fallback: if no workflow rows exist (or approver mismatch), approve directly.
      if (/no pending approval/i.test(workflowErr.message || '')) {
        result = await directApprove(id, approver_id, approver_name, comments);
        return NextResponse.json({ success: true, data: result, message: result.message });
      }
      throw workflowErr;
    }
    
    // If workflow is complete and approved, update attendance
    if (result.is_complete && result.final_status === 'APPROVED') {
      // Get leave request details
      const { Pool } = require('pg');
      
      const leaveResult = await pool.query(
        `SELECT 
          id,
          employee_id,
          leave_type_code,
          start_date,
          end_date,
          return_date,
          working_days_count,
          status
         FROM leave_requests
         WHERE id = $1`,
        [id]
      );
      
      if (leaveResult.rows.length > 0) {
        await attendanceIntegration.updateAttendanceForApprovedLeave(
          leaveResult.rows[0]
        );
      }
      
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error approving leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to approve leave request',
    }, { status: 500 });
  }
}
