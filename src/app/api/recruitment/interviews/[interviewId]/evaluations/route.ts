import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get all evaluations for an interview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await query(
      'SELECT 1 FROM interviews WHERE interview_id = $1 AND workspace_id = $2',
      [interviewId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const result = await query(`
      SELECT ev.*, u.name as evaluator_name
      FROM interview_evaluations ev
      LEFT JOIN users u ON ev.evaluator_id = u.userid
      WHERE ev.interview_id = $1
      ORDER BY ev.submitted_at DESC
    `, [interviewId]);

    // Calculate average scores
    const evaluations = result.rows;
    let avgOverall = 0;
    if (evaluations.length > 0) {
      const sum = evaluations.reduce((acc: number, e: any) => acc + (parseFloat(e.overall_rating) || 0), 0);
      avgOverall = sum / evaluations.length;
    }

    // Recommendation breakdown
    const recommendations: Record<string, number> = {};
    evaluations.forEach((e: any) => {
      const rec = e.recommendation || 'UNKNOWN';
      recommendations[rec] = (recommendations[rec] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: evaluations,
      count: evaluations.length,
      averageRating: parseFloat(avgOverall.toFixed(2)),
      recommendations
    });
  } catch (error: any) {
    console.error('Get evaluations error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}

// POST - Submit an evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await query(
      'SELECT 1 FROM interviews WHERE interview_id = $1 AND workspace_id = $2',
      [interviewId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const {
      evaluatorId,
      overallRating,
      recommendation,
      strengths,
      weaknesses,
      detailedFeedback,
      criteriaScores,
      isConfidential,
    } = body;

    if (!evaluatorId || !overallRating || !recommendation) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: evaluatorId, overallRating, recommendation' },
        { status: 400 }
      );
    }

    // Check for existing evaluation by this evaluator
    const existing = await query(
      'SELECT evaluation_id FROM interview_evaluations WHERE interview_id = $1 AND evaluator_id = $2',
      [interviewId, evaluatorId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await query(`
        UPDATE interview_evaluations
        SET overall_rating = $1, recommendation = $2,
            strengths = $3, weaknesses = $4,
            detailed_feedback = $5, criteria_scores = $6,
            is_confidential = $7, submitted_at = NOW(), updated_at = NOW()
        WHERE evaluation_id = $8
        RETURNING *
      `, [
        overallRating, recommendation,
        strengths || null, weaknesses || null,
        detailedFeedback || null, JSON.stringify(criteriaScores || {}),
        isConfidential || false, existing.rows[0].evaluation_id
      ]);
    } else {
      // Create new
      result = await query(`
        INSERT INTO interview_evaluations (
          interview_id, evaluator_id, overall_rating, recommendation,
          strengths, weaknesses, detailed_feedback, criteria_scores,
          is_confidential, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        interviewId, evaluatorId, overallRating, recommendation,
        strengths || null, weaknesses || null,
        detailedFeedback || null, JSON.stringify(criteriaScores || {}),
        isConfidential || false
      ]);
    }

    // Update panel member submission status
    await query(`
      UPDATE interview_panel
      SET has_submitted_evaluation = TRUE
      WHERE interview_id = $1 AND interviewer_id = $2
    `, [interviewId, evaluatorId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: existing.rows.length > 0 ? 'Evaluation updated' : 'Evaluation submitted'
    }, { status: existing.rows.length > 0 ? 200 : 201 });
  } catch (error: any) {
    console.error('Submit evaluation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit evaluation' },
      { status: 500 }
    );
  }
}
