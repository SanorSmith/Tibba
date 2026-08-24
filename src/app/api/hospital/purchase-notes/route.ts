import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import { ensureSchema } from '@/lib/db/ensure-schema';

export async function GET(req: NextRequest) {
  // Inventory is facility-private: resolve the caller’s facility per request.
  // This was a hardcoded Hospital 1 id, so every facility saw Hospital 1’s stock.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  const status  = req.nextUrl.searchParams.get("status")   ?? "";
  const orderId = req.nextUrl.searchParams.get("order_id") ?? "";
  try {
    // If order_id provided, return full PN + items for that order's latest PN
    if (orderId) {
      await ensureSchema(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
      await ensureSchema(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS claim_damage INTEGER`).catch(()=>{});
      const pn = await pool.query(
        `SELECT * FROM hospital_purchase_notes WHERE workspace_id=$1 AND order_id=$2 ORDER BY createdat DESC LIMIT 1`,
        [WS, orderId]
      );
      if (!pn.rows[0]) return NextResponse.json(null);
      const items = await pool.query(
        `SELECT * FROM hospital_purchase_note_items WHERE note_id=$1 ORDER BY createdat`,
        [pn.rows[0].id]
      );
      return NextResponse.json({ note: pn.rows[0], items: items.rows });
    }
    const r = await pool.query(
      `SELECT pn.*,
        (SELECT COUNT(*) FROM hospital_purchase_note_items pni WHERE pni.note_id = pn.id)::int AS item_count
       FROM hospital_purchase_notes pn
       WHERE pn.workspace_id = $1 AND ($2='' OR pn.status=$2)
       ORDER BY pn.createdat DESC`,
      [WS, status]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}

export async function POST(req: NextRequest) {
  // Inventory is facility-private: resolve the caller’s facility per request.
  // This was a hardcoded Hospital 1 id, so every facility saw Hospital 1’s stock.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  try {
    const b = await req.json();
    const { orderId, orderNumber, supplierName, supplierRef, deliveryDate, createdBy, notes, items } = b;

    if (!items?.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const noteNum = `PN-${Date.now().toString().slice(-8)}`;

    const r = await pool.query(
      `INSERT INTO hospital_purchase_notes
         (id, workspace_id, note_number, order_id, order_number, supplier_name,
          supplier_ref, delivery_date, created_by, status, notes, createdat, updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,NOW(),NOW())
       RETURNING *`,
      [WS, noteNum, orderId||null, orderNumber||null, supplierName||null,
       supplierRef||null, deliveryDate||null, createdBy||null, notes||null]
    );

    const noteId = r.rows[0].id;
    await ensureSchema(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
    await ensureSchema(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS claim_damage INTEGER`).catch(()=>{});
    for (const item of items) {
      await pool.query(
        `INSERT INTO hospital_purchase_note_items
           (id, note_id, item_id, item_name, uom, ordered_qty, delivered_qty, delivered_total, claim_damage, notes, createdat)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [noteId, item.itemId||null, item.itemName, item.uom||null,
         item.orderedQty||0, item.deliveredQty||0,
         item.deliveredTotal||null, item.claimDamage||null, item.notes||null]
      );
    }

    return NextResponse.json(r.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
