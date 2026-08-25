import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const body = await request.json();
    const {
      cv_summary,
      education,
      work_history,
      certifications,
      languages,
      skills,
    } = body;

    // Update employee profile
    await pool.query(`
      UPDATE staff 
      SET 
        cv_summary = $1,
        education = $2,
        work_history = $3,
        certifications = $4,
        languages = $5,
        skills = $6,
        profile_completed = true,
        profile_completion_date = NOW(),
        updated_at = NOW()
      WHERE staffid = $7 AND workspaceid = $8
    `, [
      cv_summary || null,
      JSON.stringify(education || []),
      JSON.stringify(work_history || []),
      JSON.stringify(certifications || []),
      JSON.stringify(languages || []),
      JSON.stringify(skills || []),
      id,
      workspaceId
    ]);


    return NextResponse.json({
      success: true,
      message: 'Employee profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating employee profile:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update employee profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const result = await pool.query(`
      SELECT 
        cv_summary,
        education,
        work_history,
        certifications,
        languages,
        skills,
        profile_completed,
        profile_completion_date
      FROM staff 
      WHERE staffid = $1 AND workspaceid = $2
    `, [id, workspaceId]);


    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching employee profile:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
  });
}
