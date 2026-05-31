/**
 * PUT /api/insurance-pre-approvals/[id]
 * Approve / deny / update a pre-approval request.
 * Body: { action: 'approve'|'deny', authorized_amount?, expiration_date?, denial_reason? }
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

export async function PUT(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const b = await req.json();
    const action = b.action;

    if (action === 'approve') {
      const r = await pool.query(
        `UPDATE insurance_pre_approvals
         SET status='APPROVED', response_date=CURRENT_DATE,
             authorized_amount=COALESCE($2, authorized_amount),
             expiration_date=$3, updatedat=NOW()
         WHERE preapprovalid=$1 RETURNING preapprovalid AS id, status`,
        [id, b.authorized_amount ?? null, b.expiration_date ?? null]
      );
      if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: r.rows[0] });
    }

    if (action === 'deny') {
      const r = await pool.query(
        `UPDATE insurance_pre_approvals
         SET status='DENIED', response_date=CURRENT_DATE, denial_reason=$2, updatedat=NOW()
         WHERE preapprovalid=$1 RETURNING preapprovalid AS id, status`,
        [id, b.denial_reason || 'Not specified']
      );
      if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: r.rows[0] });
    }

    return NextResponse.json({ error: 'action must be approve or deny' }, { status: 400 });
  } catch (error) {
    console.error('[pre-approvals PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
