import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Review a completed assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
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
  } catch (error: any) {
    console.error('Review assessment error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to review assessment' }, { status: 500 });
  }
}
