import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Complete a reference check with feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  try {
    const { referenceId } = await params;
    const body = await request.json();
    const {
      overallRating, recommendation, wouldRehire,
      strengths, concerns, additionalComments, verifiedBy,
    } = body;

    const result = await query(`
      UPDATE reference_checks
      SET status = 'COMPLETED', completed_date = NOW(),
          overall_rating = $1, recommendation = $2, would_rehire = $3,
          strengths = $4, concerns = $5, additional_comments = $6,
          verified_by = $7, updated_at = NOW()
      WHERE reference_id = $8
      RETURNING *
    `, [
      overallRating || null, recommendation || null, wouldRehire ?? null,
      strengths || null, concerns || null, additionalComments || null,
      verifiedBy || null, referenceId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Reference not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Reference check completed'
    });
  } catch (error: any) {
    console.error('Complete reference error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to complete reference check' }, { status: 500 });
  }
}
