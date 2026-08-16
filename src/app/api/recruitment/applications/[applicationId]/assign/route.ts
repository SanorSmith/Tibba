import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// POST - Assign a recruiter to an application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { recruiterId } = body;

    if (!recruiterId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: recruiterId' },
        { status: 400 }
      );
    }

    const result = await query(`
      UPDATE job_applications
      SET updated_at = NOW()
      WHERE application_id = $1
      RETURNING *
    `, [applicationId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Add a note about assignment
    await query(`
      INSERT INTO candidate_notes (
        candidate_id, application_id, author_id, note_type, content
      ) VALUES (
        (SELECT candidate_id FROM job_applications WHERE application_id = $1),
        $1, $2, 'SYSTEM', $3
      )
    `, [applicationId, recruiterId, `Recruiter assigned to this application`]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Recruiter assigned successfully'
    });
  } catch (error: any) {
    console.error('Assign recruiter error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to assign recruiter' },
      { status: 500 }
    );
  }
}
