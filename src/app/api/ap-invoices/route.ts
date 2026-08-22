/**
 * GET  /api/ap-invoices          — list AP invoices with optional filters
 * POST /api/ap-invoices          — create AP invoice (manual or from GRN)
 */
import { NextRequest, NextResponse } from 'next/server';
import { postAPInvoiceReceived } from '@/lib/gl-posting';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status    = searchParams.get('status');
  const vendor_id = searchParams.get('vendor_id');
  const from      = searchParams.get('from');
  const to        = searchParams.get('to');

  try {
    // AP invoices may originate from the Inventory module (po_id → hospital_orders)
    // or legacy Finance flow. We rely on the vendor_name stored on the invoice and
    // pull the order number from hospital_orders when available.
    let q = `
      SELECT
        ap.*,
        COALESCE(ap.vendor_name, ho.supplier_name) AS vendor_name_resolved,
        ho.order_number AS po_number
      FROM ap_invoices ap
      LEFT JOIN hospital_orders ho ON ap.po_id = ho.id
      WHERE ap.workspaceid = $1
    `;
    const params: any[] = [ws];
    let idx = 2;
    if (status)    { q += ` AND ap.status = $${idx++}`;              params.push(status); }
    if (vendor_id) { q += ` AND ap.vendor_id = $${idx++}`;           params.push(vendor_id); }
    if (from)      { q += ` AND ap.invoice_date >= $${idx++}`;       params.push(from); }
    if (to)        { q += ` AND ap.invoice_date <= $${idx++}`;       params.push(to); }
    q += ' ORDER BY ap.invoice_date DESC, ap.createdat DESC';

    const result = await pool.query(q, params);

    // Totals
    const totalPending = result.rows
      .filter(r => r.status !== 'PAID')
      .reduce((s, r) => s + parseFloat(r.balance_due || '0'), 0);
    const totalPaid = result.rows
      .filter(r => r.status === 'PAID')
      .reduce((s, r) => s + parseFloat(r.total_amount || '0'), 0);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      totals: { pending: totalPending, paid: totalPaid },
    });
  } catch (error) {
    console.error('[ap-invoices GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // GL entries post to the caller’s facility ledger.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      grn_id,
      po_id,
      vendor_id,
      vendor_name,
      invoice_date = new Date().toISOString().split('T')[0],
      due_date,
      total_amount,
      notes,
    } = body;

    if (!total_amount || parseFloat(total_amount) <= 0) {
      return NextResponse.json({ error: 'total_amount is required and must be > 0' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Generate AP number
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100_000).toString().padStart(5, '0');
    const ap_number = `AP-${year}-${rand}`;

    const result = await client.query(
      `INSERT INTO ap_invoices
         (ap_number, grn_id, po_id, vendor_id, vendor_name,
          invoice_date, due_date, total_amount, status, notes, createdat, updatedat)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,NOW(),NOW())
       RETURNING *`,
      [ap_number, grn_id ?? null, po_id ?? null, vendor_id ?? null,
       vendor_name ?? null, invoice_date,
       due_date ?? null, parseFloat(total_amount), notes ?? null]
    );
    const apInvoice = result.rows[0];

    // Link GRN → AP invoice
    if (grn_id) {
      await client.query(
        `UPDATE goods_receipt_notes SET ap_invoice_id = $1, updatedat = NOW() WHERE id = $2`,
        [apInvoice.id, grn_id]
      );
    }

    // GL posting: DR Expense, CR Payable
    const resolvedVendorName = vendor_name ?? 'Vendor';
    await postAPInvoiceReceived(client, ws, apInvoice.id, resolvedVendorName, parseFloat(total_amount), invoice_date, apInvoice.ap_number);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: apInvoice }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ap-invoices POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
