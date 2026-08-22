import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';
import { pool } from '@/lib/db/pool';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { approver_id, approver_name, rejection_reason } = body;

    // This handler passes a client-supplied id to a service that reads
    // facility data keyed by that id alone, so the check belongs here.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await pool.query(
      'SELECT 1 FROM leave_requests WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    if (!approver_id || !approver_name || !rejection_reason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: approver_id, approver_name, rejection_reason',
      }, { status: 400 });
    }
    
    const result = await approvalWorkflow.rejectLeaveRequest(
      id,
      approver_id,
      approver_name,
      rejection_reason
    );
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error rejecting leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reject leave request',
    }, { status: 500 });
  }
}
