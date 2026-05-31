import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

/**
 * GET /api/purchase-requests
 * Returns purchase orders from the real purchase_orders table.
 */
export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');

    let query = `
      SELECT
        po.id,
        po.ponumber         AS request_number,
        po.status,
        po.orderdate        AS created_at,
        po.expecteddate     AS expected_date,
        po.totalamount      AS estimated_cost,
        po.currency,
        po.notes,
        po.approvedby       AS approved_by,
        po.sentby           AS requested_by,
        po.paymentterms,
        v.name              AS vendor_name,
        v.id                AS vendor_id,
        w.name              AS warehouse_name
      FROM purchase_orders po
      LEFT JOIN vendors v       ON po.vendorid = v.id
      LEFT JOIN warehouses w    ON po.warehouseid = w.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let idx = 1;

    if (status) {
      query += ` AND po.status = $${idx++}`;
      params.push(status);
    }
    if (vendorId) {
      query += ` AND po.vendorid = $${idx++}`;
      params.push(vendorId);
    }

    query += ` ORDER BY po.createdat DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[purchase-requests GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchase-requests
 * Creates a new purchase order.
 */
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      vendor_id,
      warehouse_id,
      expected_date,
      total_amount,
      currency = 'IQD',
      payment_terms,
      shipping_address,
      notes,
      requested_by,
    } = body;

    if (!vendor_id) {
      return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 });
    }

    // Generate PO number: PO-YYYY-NNNN
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const poNumber = `PO-${year}-${rand}`;

    const result = await pool.query(
      `INSERT INTO purchase_orders (
         ponumber, vendorid, warehouseid, status,
         orderdate, expecteddate, totalamount, currency,
         paymentterms, shippingaddress, notes, sentby,
         createdat, updatedat
       ) VALUES (
         $1, $2, $3, 'draft',
         NOW(), $4, $5, $6,
         $7, $8, $9, $10,
         NOW(), NOW()
       ) RETURNING *`,
      [
        poNumber,
        vendor_id,
        warehouse_id || null,
        expected_date || null,
        total_amount?.toString() || '0',
        currency,
        payment_terms || null,
        shipping_address || null,
        notes || null,
        requested_by || null,
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('[purchase-requests POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
