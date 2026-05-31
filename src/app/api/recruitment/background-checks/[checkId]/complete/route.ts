import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Complete a background check with results
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await params;
    const body = await request.json();
    const { result: checkResult, details, reportUrl, expiryDate, verifiedBy, notes } = body;

    if (!checkResult || !['CLEAR', 'FLAGGED', 'FAILED'].includes(checkResult)) {
      return NextResponse.json(
        { success: false, error: 'result must be CLEAR, FLAGGED, or FAILED' },
        { status: 400 }
      );
    }

    const updateResult = await query(`
      UPDATE background_checks
      SET status = 'COMPLETED', completed_date = NOW(),
          result = $1, details = $2, report_url = $3,
          expiry_date = $4, verified_by = $5, notes = $6,
          updated_at = NOW()
      WHERE check_id = $7
      RETURNING *
    `, [
      checkResult, JSON.stringify(details || {}), reportUrl || null,
      expiryDate || null, verifiedBy || null, notes || null, checkId
    ]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Background check not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: `Background check completed: ${checkResult}`
    });
  } catch (error: any) {
    console.error('Complete background check error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to complete background check' }, { status: 500 });
  }
}
