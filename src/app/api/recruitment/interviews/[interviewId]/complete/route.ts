import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Mark interview as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    const body = await request.json();
    const { summary, overallRating, overallRecommendation } = body;

    const result = await query(`
      UPDATE interviews
      SET status = 'COMPLETED',
          summary = $1,
          overall_rating = $2,
          overall_recommendation = $3,
          updated_at = NOW()
      WHERE interview_id = $4
      RETURNING *
    `, [summary || null, overallRating || null, overallRecommendation || null, interviewId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Interview marked as completed'
    });
  } catch (error: any) {
    console.error('Complete interview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete interview' },
      { status: 500 }
    );
  }
}
