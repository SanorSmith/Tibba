import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Review a completed assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
    
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
      'SELECT 1 FROM candidate_assessments WHERE assessment_id = $1 AND workspaceid = $2',
      [assessmentId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { evaluatedBy, evaluatorNotes } = body;

    const result = await query(`
      UPDATE candidate_assessments
      SET evaluated_by = $1, evaluator_notes = $2, updated_at = NOW()
      WHERE assessment_id = $3
      RETURNING *
    `, [evaluatedBy || null, evaluatorNotes || null, assessmentId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Assessment reviewed'
    });
    });
  } catch (error: any) {
    console.error('Review assessment error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to review assessment' }, { status: 500 });
  }
}
