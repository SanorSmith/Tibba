import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - List reference checks for an application
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const result = await query(`
      SELECT * FROM reference_checks
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, [applicationId]);

    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('Get reference checks error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch references' }, { status: 500 });
  }
}

// POST - Add a reference check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      applicationId, refereeName, refereeTitle, refereeCompany,
      refereeEmail, refereePhone, relationship, yearsKnown,
    } = body;

    if (!applicationId || !refereeName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, refereeName' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO reference_checks (
        application_id, referee_name, referee_title, referee_company,
        referee_email, referee_phone, relationship, years_known, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
    `, [
      applicationId, refereeName, refereeTitle || null, refereeCompany || null,
      refereeEmail || null, refereePhone || null, relationship || null, yearsKnown || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Reference check added'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Add reference check error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to add reference' }, { status: 500 });
  }
}
