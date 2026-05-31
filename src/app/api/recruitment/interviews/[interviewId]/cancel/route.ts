import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Cancel an interview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    const body = await request.json();
    const { cancellationReason, cancelledBy } = body;

    const result = await query(`
      UPDATE interviews
      SET status = 'CANCELLED',
          cancelled_reason = $1,
          updated_at = NOW()
      WHERE interview_id = $2
      RETURNING *
    `, [cancellationReason || null, interviewId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Interview cancelled'
    });
  } catch (error: any) {
    console.error('Cancel interview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel interview' },
      { status: 500 }
    );
  }
}
