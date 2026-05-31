import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - List background checks for an application
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const result = await query(`
      SELECT * FROM background_checks
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, [applicationId]);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('Get background checks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch background checks' }, { status: 500 });
  }
}

// POST - Request a background check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, checkType, provider, notes } = body;

    if (!applicationId || !checkType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, checkType' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO background_checks (
        application_id, check_type, provider, notes,
        requested_date, status
      ) VALUES ($1, $2, $3, $4, NOW(), 'PENDING')
      RETURNING *
    `, [applicationId, checkType, provider || null, notes || null]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Background check requested'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Request background check error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to request background check' }, { status: 500 });
  }
}
