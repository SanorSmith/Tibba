import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - List reference checks for an application
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const result = await query(`
      SELECT * FROM reference_checks
      WHERE application_id = $1 AND workspaceid = $2
      ORDER BY created_at DESC
    `, [applicationId, workspaceId]);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('Get reference checks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch references' }, { status: 500 });
  }
}

// POST - Add a reference check
export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json();
    const {
      applicationId, refereeName, refereeTitle, refereeCompany,
      refereeEmail, refereePhone, relationship, yearsKnown,
    } = body;

    if (!applicationId || !refereeName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, refereeName' },
        { status: 400 }
      );
    }


    // The parent application must be ours.
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const result = await query(`
      INSERT INTO reference_checks (
        application_id, referee_name, referee_title, referee_company,
        referee_email, referee_phone, relationship, years_known, status,
        workspaceid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
      RETURNING *
    `, [
      applicationId, refereeName, refereeTitle || null, refereeCompany || null,
      refereeEmail || null, refereePhone || null, relationship || null, yearsKnown || null,
      workspaceId
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Reference check added'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Add reference check error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to add reference' }, { status: 500 });
  }
}
