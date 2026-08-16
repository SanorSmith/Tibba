import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { current_approver_id, delegate_to_id, delegate_to_name, reason } = body;

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
    
    if (!current_approver_id || !delegate_to_id || !delegate_to_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: current_approver_id, delegate_to_id, delegate_to_name',
      }, { status: 400 });
    }
    
    const result = await approvalWorkflow.delegateApproval(
      id,
      current_approver_id,
      delegate_to_id,
      delegate_to_name,
      reason
    );
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error delegating approval:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delegate approval',
    }, { status: 500 });
  }
}
