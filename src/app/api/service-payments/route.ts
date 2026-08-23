import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


/**
 * GET /api/service-payments
 * Query params: invoice_id, patient_id, from, to, status
 */
export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(workspaceId, async () => {

  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const patientId = searchParams.get('patient_id');
    const from      = searchParams.get('from');
    const to        = searchParams.get('to');
    const status    = searchParams.get('status');

    let query = `
      SELECT
        sp.*,
        i.invoice_number,
        i.total_amount   AS invoice_total,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname AS patient_name
      FROM service_payments sp
      LEFT JOIN invoices i ON sp.invoice_id = i.id
      LEFT JOIN patients p ON sp.patient_id = p.patientid
      WHERE sp.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let idx = 2;

    if (invoiceId) { query += ` AND sp.invoice_id = $${idx++}`; params.push(invoiceId); }
    if (patientId) { query += ` AND sp.patient_id = $${idx++}`; params.push(patientId); }
    if (status)    { query += ` AND sp.status = $${idx++}`;     params.push(status); }
    if (from)      { query += ` AND sp.payment_date >= $${idx++}`; params.push(from); }
    if (to)        { query += ` AND sp.payment_date <= $${idx++}`; params.push(to + ' 23:59:59'); }

    query += ` ORDER BY sp.payment_date DESC`;

    const result = await pool.query(query, params);

    // Summary totals
    const totalPaid = result.rows.reduce(
      (sum: number, r: any) => sum + (parseFloat(String(r.amount)) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      total_paid: totalPaid,
    });
  } catch (error) {
    console.error('[service-payments GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service payments', detail: (error as Error).message },
      { status: 500 }
    );
  }
  });
}

/**
 * POST /api/service-payments
 * Records a payment for an invoice. Also updates invoices.amount_paid / balance_due / status.
 */
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(workspaceId, async () => {

  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      invoice_id,
      patient_id,
      amount,
      payment_method = 'CASH',
      reference_number,
      notes,
      received_by,
    } = body;

    if (!invoice_id || !amount) {
      return NextResponse.json(
        { error: 'invoice_id and amount are required' },
        { status: 400 }
      );
    }

    const payAmt = parseFloat(String(amount));
    if (isNaN(payAmt) || payAmt <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Verify invoice exists and get current balances
    const invResult = await client.query(
      `SELECT id, total_amount, amount_paid, balance_due, status
       FROM invoices WHERE id = $1 AND workspaceid = $2 FOR UPDATE`,
      [invoice_id, workspaceId]
    );
    if (invResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const inv = invResult.rows[0];
    if (inv.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cannot record payment on a cancelled invoice' }, { status: 400 });
    }

    // 2. Insert payment record
    const spResult = await client.query(
      `INSERT INTO service_payments (
         invoice_id, patient_id, amount, payment_method,
         reference_number, notes, received_by, status, workspaceid
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', $8)
       RETURNING *`,
      [
        invoice_id,
        patient_id || inv.patient_id || null,
        payAmt,
        payment_method,
        reference_number || null,
        notes || null,
        received_by || null,
        workspaceId,
      ]
    );

    // 3. Update invoice financials
    const newAmountPaid = (parseFloat(String(inv.amount_paid)) || 0) + payAmt;
    const totalAmount   = parseFloat(String(inv.total_amount)) || 0;
    const newBalance    = Math.max(0, totalAmount - newAmountPaid);
    const newStatus     = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    await client.query(
      `UPDATE invoices
       SET amount_paid = $1, balance_due = $2, status = $3, updatedat = NOW()
       WHERE id = $4`,
      [newAmountPaid, newBalance, newStatus, invoice_id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        data: spResult.rows[0],
        invoice_updated: {
          amount_paid: newAmountPaid,
          balance_due: newBalance,
          status: newStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[service-payments POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment', detail: (error as Error).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
  });
}
