import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - List candidate assessments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        ca.*,
        at.test_name, at.test_type, at.description as test_description,
        at.duration_minutes, at.passing_score as test_passing_score,
        a.application_number,
        c.first_name as candidate_first_name, c.last_name as candidate_last_name
      FROM candidate_assessments ca
      LEFT JOIN assessment_tests at ON ca.test_id = at.test_id
      LEFT JOIN job_applications a ON ca.application_id = a.application_id
      LEFT JOIN job_candidates c ON a.candidate_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (applicationId) { sql += ` AND ca.application_id = $${idx++}`; params.push(applicationId); }
    if (status) { sql += ` AND ca.status = $${idx++}`; params.push(status); }

    sql += ' ORDER BY ca.assigned_date DESC';

    const result = await query(sql, params);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('Get assessments error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch assessments' }, { status: 500 });
  }
}

// POST - Assign assessment to candidate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, testId, dueDate } = body;

    if (!applicationId || !testId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, testId' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await query(
      'SELECT assessment_id FROM candidate_assessments WHERE application_id = $1 AND test_id = $2',
      [applicationId, testId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment already assigned to this candidate' },
        { status: 400 }
      );
    }

    // Get test max score
    const testResult = await query('SELECT max_score FROM assessment_tests WHERE test_id = $1', [testId]);
    const maxScore = testResult.rows[0]?.max_score || 100;

    const result = await query(`
      INSERT INTO candidate_assessments (
        application_id, test_id, assigned_date, due_date,
        max_score, status
      ) VALUES ($1, $2, NOW(), $3, $4, 'ASSIGNED')
      RETURNING *
    `, [applicationId, testId, dueDate || null, maxScore]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Assessment assigned to candidate'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Assign assessment error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to assign assessment' }, { status: 500 });
  }
}
