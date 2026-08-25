/**
 * /api/shareholders/[id]
 * GET    — single shareholder
 * PUT    — update (partial)
 * DELETE — remove
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const r = await pool.query('SELECT * FROM shareholders WHERE id = $1 AND workspaceid = $2', [id, workspaceId]);
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
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
    vals.push(id, workspaceId);

    const r = await pool.query(
      `UPDATE shareholders SET ${sets.join(', ')} WHERE id = $${idx} AND workspaceid = $${idx + 1} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    console.error('[shareholders PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const r = await pool.query('DELETE FROM shareholders WHERE id = $1 AND workspaceid = $2 RETURNING id', [id, workspaceId]);
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}
