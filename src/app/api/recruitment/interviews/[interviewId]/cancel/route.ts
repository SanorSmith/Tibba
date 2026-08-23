import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Cancel an interview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM interviews WHERE interview_id = $1 AND workspace_id = $2',
      [interviewId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { cancellationReason, cancelledBy } = body;

    const result = await query(`
      UPDATE interviews
      SET status = 'CANCELLED',
          cancelled_reason = $1,
          updated_at = NOW()
      WHERE interview_id = $2
      RETURNING *
    `, [cancellationReason || null, interviewId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Interview cancelled'
    });
    });
  } catch (error: any) {
    console.error('Cancel interview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel interview' },
      { status: 500 }
    );
  }
}
