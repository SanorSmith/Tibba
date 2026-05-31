import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - List assessment tests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const testType = searchParams.get('testType');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    let sql = 'SELECT * FROM assessment_tests WHERE workspace_id = $1 AND is_active = TRUE';
    const params: any[] = [workspaceId];
    let idx = 2;

    if (testType) { sql += ` AND test_type = $${idx++}`; params.push(testType); }
    sql += ' ORDER BY test_name';

    const result = await query(sql, params);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('Get assessment tests error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch tests' }, { status: 500 });
  }
}

// POST - Create new assessment test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId, testName, testType, description,
      durationMinutes, passingScore, maxScore,
      instructions, testContent, createdBy,
    } = body;

    if (!workspaceId || !testName || !testType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: workspaceId, testName, testType' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO assessment_tests (
        workspace_id, test_name, test_type, description,
        duration_minutes, passing_score, max_score,
        instructions, test_content, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
      RETURNING *
    `, [
      workspaceId, testName, testType, description || null,
      durationMinutes || null, passingScore || 70, maxScore || 100,
      instructions || null, JSON.stringify(testContent || {}), createdBy || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Assessment test created'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create assessment test error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create test' }, { status: 500 });
  }
}
