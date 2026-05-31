import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Submit assessment results
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
    const body = await request.json();
    const { score, answers } = body;

    if (score === undefined || score === null) {
      return NextResponse.json({ success: false, error: 'Missing required field: score' }, { status: 400 });
    }

    // Get assessment with test details
    const existing = await query(`
      SELECT ca.*, at.passing_score, at.max_score as test_max_score
      FROM candidate_assessments ca
      LEFT JOIN assessment_tests at ON ca.test_id = at.test_id
      WHERE ca.assessment_id = $1
    `, [assessmentId]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    const assessment = existing.rows[0];
    const maxScore = parseFloat(assessment.max_score || assessment.test_max_score || 100);
    const passingScore = parseFloat(assessment.passing_score || 70);
    const percentage = (parseFloat(score) / maxScore) * 100;
    const passed = percentage >= passingScore;

    const result = await query(`
      UPDATE candidate_assessments
      SET score = $1, percentage = $2, passed = $3,
          status = 'COMPLETED', completed_at = NOW(),
          answers = $4, updated_at = NOW()
      WHERE assessment_id = $5
      RETURNING *
    `, [score, percentage.toFixed(2), passed, JSON.stringify(answers || {}), assessmentId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      passed,
      percentage: parseFloat(percentage.toFixed(2)),
      message: passed ? 'Assessment passed!' : 'Assessment failed'
    });
  } catch (error: any) {
    console.error('Submit assessment error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit assessment' }, { status: 500 });
  }
}
