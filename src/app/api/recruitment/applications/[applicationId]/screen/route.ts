import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Screen an application (pass/fail)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    
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
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { screeningScore, screeningNotes, decision, screenedBy } = body;

    if (!decision || !['PASS', 'FAIL'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'decision must be PASS or FAIL' },
        { status: 400 }
      );
    }

    let sql: string;
    let params_arr: any[];

    if (decision === 'FAIL') {
      sql = `
        UPDATE job_applications
        SET status = 'REJECTED',
            match_score = $1,
            rejection_reason = $2,
            rejection_stage = 'SCREENING',
            rejected_at = NOW(),
            updated_at = NOW()
        WHERE application_id = $3
        RETURNING *
      `;
      params_arr = [screeningScore || null, screeningNotes || 'Failed screening', applicationId];
    } else {
      sql = `
        UPDATE job_applications
        SET status = 'SCREENING',
            match_score = $1,
            updated_at = NOW()
        WHERE application_id = $2
        RETURNING *
      `;
      params_arr = [screeningScore || null, applicationId];
    }

    const result = await query(sql, params_arr);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Add a note about screening
    if (screeningNotes) {
      await query(`
        INSERT INTO candidate_notes (candidate_id, application_id, author_id, note_type, content)
        VALUES (
          (SELECT candidate_id FROM job_applications WHERE application_id = $1),
          $1, $2, 'SCREENING', $3
        )
      `, [applicationId, screenedBy || '00000000-0000-0000-0000-000000000000', screeningNotes]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: decision === 'PASS' ? 'Candidate passed screening' : 'Candidate rejected at screening'
    });
    });
  } catch (error: any) {
    console.error('Screen application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to screen application' },
      { status: 500 }
    );
  }
}
