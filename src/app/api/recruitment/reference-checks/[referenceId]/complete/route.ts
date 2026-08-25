import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Complete a reference check with feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  try {
    const { referenceId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM reference_checks WHERE reference_id = $1 AND workspaceid = $2',
      [referenceId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const {
      overallRating, recommendation, wouldRehire,
      strengths, concerns, additionalComments, verifiedBy,
    } = body;

    const result = await query(`
      UPDATE reference_checks
      SET status = 'COMPLETED', completed_date = NOW(),
          overall_rating = $1, recommendation = $2, would_rehire = $3,
          strengths = $4, concerns = $5, additional_comments = $6,
          verified_by = $7, updated_at = NOW()
      WHERE reference_id = $8
      RETURNING *
    `, [
      overallRating || null, recommendation || null, wouldRehire ?? null,
      strengths || null, concerns || null, additionalComments || null,
      verifiedBy || null, referenceId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Reference not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Reference check completed'
    });
    });
  } catch (error: any) {
    console.error('Complete reference error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to complete reference check' }, { status: 500 });
  }
}
