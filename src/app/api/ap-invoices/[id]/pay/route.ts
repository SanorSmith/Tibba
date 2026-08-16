/**
 * POST /api/ap-invoices/[id]/pay
 * Record a payment against an AP invoice and post to GL.
 * Body: { amount, payment_date?, payment_method?, payment_ref?, notes? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { postAPPayment } from '@/lib/gl-posting';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  // GL entries post to the caller’s facility ledger.
  const ws = getWorkspaceId(req);
  if (!ws) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;

  const client = await pool.connect();
  try {
    const body = await req.json();
    const {
      amount,
      payment_date = new Date().toISOString().split('T')[0],
      payment_method,
      payment_ref,
      notes,
    } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
    }

    // Fetch current AP invoice + its originating order number (for GL traceability)
    const apRes = await pool.query(
      `SELECT ap.id, ap.ap_number, ap.vendor_name, ap.total_amount, ap.amount_paid, ap.status,
              ho.order_number
       FROM ap_invoices ap
       LEFT JOIN hospital_orders ho ON ap.po_id = ho.id
       WHERE ap.id = $1 AND ap.workspaceid = $2`, [id, ws]
    );
    if (apRes.rows.length === 0) {
      return NextResponse.json({ error: 'AP invoice not found' }, { status: 404 });
    }
    const ap = apRes.rows[0];

    if (ap.status === 'PAID') {
      return NextResponse.json({ error: 'AP invoice already fully paid' }, { status: 400 });
    }

    const newPaid    = (parseFloat(ap.amount_paid) || 0) + parseFloat(amount);
    const newBalance = parseFloat(ap.total_amount) - newPaid;
    const newStatus  = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

    await client.query('BEGIN');

    const updRes = await client.query(
      `UPDATE ap_invoices SET
         amount_paid    = $1,
         status         = $2,
         payment_date   = $3,
         payment_method = COALESCE($4, payment_method),
         payment_ref    = COALESCE($5, payment_ref),
         notes          = COALESCE($6, notes),
         updatedat      = NOW()
       WHERE id = $7
       RETURNING *`,
      [newPaid, newStatus, payment_date, payment_method ?? null, payment_ref ?? null, notes ?? null, id]
    );

    // GL posting: DR Payable, CR Cash
    await postAPPayment(
      client,
      ws,
      id,
      ap.vendor_name ?? 'Vendor',
      parseFloat(amount),
      payment_date,
      ap.order_number ? `${ap.ap_number} · ${ap.order_number}` : ap.ap_number
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: updRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ap-invoices/pay POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
