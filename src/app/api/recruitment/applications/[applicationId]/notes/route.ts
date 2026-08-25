import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - Get all notes for an application
export async function GET(
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
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const result = await query(`
      SELECT n.*, u.name as author_display_name
      FROM candidate_notes n
      LEFT JOIN users u ON n.author_id = u.userid
      WHERE n.application_id = $1
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `, [applicationId]);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
    });
  } catch (error: any) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST - Add a new note
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
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { candidateId, authorId, authorName, noteType, content, isPrivate, isPinned } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    // Get candidate_id from application if not provided
    let candId = candidateId;
    if (!candId) {
      const appResult = await query(
        'SELECT candidate_id FROM job_applications WHERE application_id = $1',
        [applicationId]
      );
      candId = appResult.rows[0]?.candidate_id;
    }

    const result = await query(`
      INSERT INTO candidate_notes (
        candidate_id, application_id, author_id, author_name,
        note_type, content, is_private, is_pinned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      candId || null, applicationId,
      authorId || '00000000-0000-0000-0000-000000000000',
      authorName || null, noteType || 'GENERAL',
      content, isPrivate || false, isPinned || false
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Note added successfully'
    }, { status: 201 });
    });
  } catch (error: any) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}
