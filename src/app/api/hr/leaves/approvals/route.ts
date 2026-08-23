import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get('approver_id');
    const leaveRequestId = searchParams.get('leave_request_id');

    // The workflow service is keyed by these ids alone, so the facility check
    // has to happen here rather than inside it.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    if (leaveRequestId) {
      const owns = await pool.query(
        'SELECT 1 FROM leave_requests WHERE id = $1 AND workspaceid = $2',
        [leaveRequestId, workspaceId]
      );
      if (owns.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    if (approverId) {
      const owns = await pool.query(
        'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
        [approverId, workspaceId]
      );
      if (owns.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    
    if (leaveRequestId) {
      const history = await approvalWorkflow.getApprovalHistory(leaveRequestId);
      
      return NextResponse.json({
        success: true,
        data: history,
        count: history.length,
      });
    }
    
    if (approverId) {
      const pending = await approvalWorkflow.getPendingApprovals(approverId);
      
      return NextResponse.json({
        success: true,
        data: pending,
        count: pending.length,
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Missing required parameter: approver_id or leave_request_id',
    }, { status: 400 });
    
    });
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch approvals',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leave_request_id, action } = body;
    
    if (!leave_request_id || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: leave_request_id and action',
      }, { status: 400 });
    }

    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await pool.query(
      'SELECT 1 FROM leave_requests WHERE id = $1 AND workspaceid = $2',
      [leave_request_id, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    if (action === 'approve') {
      const { approver_id, approver_name, comments } = body;
      
      if (!approver_id || !approver_name) {
        return NextResponse.json({
          success: false,
          error: 'Missing required parameters: approver_id and approver_name',
        }, { status: 400 });
      }
      
      const result = await approvalWorkflow.approveLeaveRequest(
        leave_request_id,
        approver_id,
        approver_name,
        comments
      );
      
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result
      });
    }
    
    if (action === 'reject') {
      const { approver_id, approver_name, rejection_reason } = body;
      
      if (!approver_id || !approver_name || !rejection_reason) {
        return NextResponse.json({
          success: false,
          error: 'Missing required parameters: approver_id, approver_name, and rejection_reason',
        }, { status: 400 });
      }
      
      const result = await approvalWorkflow.rejectLeaveRequest(
        leave_request_id,
        approver_id,
        approver_name,
        rejection_reason
      );
      
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Supported actions: approve, reject',
    }, { status: 400 });
    
    });
  } catch (error: any) {
    console.error('Error processing approval action:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process approval action',
    }, { status: 500 });
  }
}
