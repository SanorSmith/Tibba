import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const CENTRAL = '00000000-0000-0000-0000-000000000000'; // hospital central store

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  try {
    const r = await pool.query(
      `SELECT gr.*,
        (SELECT COUNT(*) FROM hospital_goods_receipt_items gri WHERE gri.receipt_id=gr.id)::int AS item_count
       FROM hospital_goods_receipt gr
       WHERE gr.workspace_id=$1 AND ($2='' OR gr.status=$2)
       ORDER BY gr.createdat DESC`,
      [WS, status]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { orderId, orderNumber, deliveryNoteNumber, receivedBy, receiptDate,
            supplierName, supplierEmail, notes, items } = b;

    if (!receivedBy?.trim()) return NextResponse.json({ error: "Received by is required" }, { status: 400 });
    if (!items?.length)      return NextResponse.json({ error: "No items" }, { status: 400 });

    const mainStoreId = CENTRAL;

    const allComplete = items.every((i: any) => parseInt(i.receivedQty) >= parseInt(i.orderedQty));
    const anyReceived = items.some((i: any)  => parseInt(i.receivedQty) > 0);
    const status      = allComplete ? "COMPLETE" : anyReceived ? "PARTIAL" : "PENDING";

    // Ensure delivery_note_number column exists
    await pool.query(`ALTER TABLE hospital_goods_receipt ADD COLUMN IF NOT EXISTS delivery_note_number VARCHAR(100)`).catch(()=>{});

    const rNum = `GR-${Date.now().toString().slice(-8)}`;
    const r = await pool.query(
      `INSERT INTO hospital_goods_receipt
         (id,workspace_id,receipt_number,order_id,order_number,delivery_note_number,received_by,
          receipt_date,supplier_name,supplier_email,status,notes,createdat,updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       RETURNING *`,
      [WS, rNum, orderId||null, orderNumber||null, deliveryNoteNumber||null, receivedBy,
       receiptDate||null, supplierName||null, supplierEmail||null, status, notes||null]
    );

    const receiptId = r.rows[0].id;

    // Ensure columns exist
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS return_claim INTEGER`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_goods_receipt_items ADD COLUMN IF NOT EXISTS dn_reg_num VARCHAR(100)`).catch(()=>{});

    // Ensure claim_damage table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_claim_damage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id UUID NOT NULL,
        item_id UUID,
        item_name TEXT,
        quantity INTEGER,
        note VARCHAR(120),
        createdat TIMESTAMP DEFAULT NOW()
      )
    `).catch(()=>{});

    for (const item of items) {
      await pool.query(
        `INSERT INTO hospital_goods_receipt_items
           (id,receipt_id,item_id,item_name,uom,ordered_qty,received_qty,delivered_total,return_claim,dn_reg_num,notes,createdat)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [receiptId, item.itemId||null, item.itemName||null, item.uom||null,
         item.orderedQty||0, item.receivedQty||0,
         null, item.returnClaim||null, item.dnRegNum||null, item.notes||null]
      );

      // Insert claim/damage record if any
      if (item.returnClaim && parseInt(item.returnClaim) > 0) {
        await pool.query(
          `INSERT INTO hospital_claim_damage (receipt_id,item_id,item_name,quantity,note,createdat)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [receiptId, item.itemId||null, item.itemName||null,
           parseInt(item.returnClaim), item.claimNote||null]
        );
      }

      // Stock qty = received minus claimed/damaged
      const stockQty = Math.max(0, parseInt(item.receivedQty) - (parseInt(item.returnClaim) || 0));

      // Update stock in Main Store
      if (stockQty > 0 && item.itemId && mainStoreId) {
        await pool.query(
          `INSERT INTO hospital_stock (id,item_id,department_id,quantity,reserved_quantity,last_updated)
           VALUES (gen_random_uuid(),$1,$2,$3,0,NOW())
           ON CONFLICT (item_id,department_id)
           DO UPDATE SET quantity=hospital_stock.quantity+$3, last_updated=NOW()`,
          [item.itemId, mainStoreId, stockQty]
        );
        await pool.query(
          `INSERT INTO hospital_batches
             (id,item_id,department_id,quantity,createdat)
           VALUES (gen_random_uuid(),$1,$2,$3,NOW())`,
          [item.itemId, mainStoreId, stockQty]
        );
        await pool.query(
          `INSERT INTO hospital_history
             (id,workspace_id,item_id,item_name,department_id,action_type,quantity,reference_id,created_by,createdat)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'STOCK_IN',$5,$6,$7,NOW())`,
          [WS, item.itemId, item.itemName, mainStoreId, stockQty, rNum, receivedBy]
        );
      }
    }

    // Update order status
    if (orderId) {
      await pool.query(
        `UPDATE hospital_orders SET status=$1, updatedat=NOW() WHERE id=$2`,
        [status==="COMPLETE"?"DELIVERED":status==="PARTIAL"?"PARTIALLY_DELIVERED":"PENDING", orderId]
      );
    }

    return NextResponse.json({ ...r.rows[0], status });
  } catch (e: any) {
    console.error("POST /api/hospital/goods-receipt error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
