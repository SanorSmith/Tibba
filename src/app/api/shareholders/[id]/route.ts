/**
 * /api/shareholders/[id]
 * GET    — single shareholder
 * PUT    — update (partial)
 * DELETE — remove
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const r = await pool.query('SELECT * FROM shareholders WHERE id = $1', [id]);
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const b = await req.json();
    // Allowed columns for partial update
    const cols = [
      'full_name', 'full_name_ar', 'email', 'phone', 'mobile', 'address', 'address_ar',
      'city', 'country', 'national_id', 'passport_number', 'date_of_birth', 'nationality',
      'share_percentage', 'number_of_shares', 'share_value', 'investment_amount', 'investment_date',
      'shareholder_type', 'company_name', 'company_registration', 'status', 'is_board_member',
      'board_position', 'total_dividends_received', 'last_dividend_date', 'notes',
    ];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const c of cols) {
      if (b[c] !== undefined) { sets.push(`${c} = $${idx++}`); vals.push(b[c] === '' ? null : b[c]); }
    }
    if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    sets.push('updated_at = NOW()');
    vals.push(id);

    const r = await pool.query(
      `UPDATE shareholders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    console.error('[shareholders PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const r = await pool.query('DELETE FROM shareholders WHERE id = $1 RETURNING id', [id]);
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
