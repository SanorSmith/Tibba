import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await pool.query(`SELECT * FROM hospital_orders WHERE id=$1`, [id]);
    const items = await pool.query(`SELECT * FROM hospital_order_items_new WHERE order_id=$1 ORDER BY createdat`, [id]);
    return NextResponse.json({ order: order.rows[0], items: items.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, edit, orderedBy, orderDate, expectedDate, supplierName, supplierEmail, supplierPhone, notes, items } = body;

    // Simple status-only update (e.g. from GR workflow or cancel)
    if (status && !edit) {
      await pool.query(`ALTER TABLE hospital_orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT`).catch(() => {});
      const { reason } = body;
      await pool.query(
        `UPDATE hospital_orders SET status=$1, cancel_reason=COALESCE($2,cancel_reason), updatedat=NOW() WHERE id=$3`,
        [status, reason||null, id]
      );
      return NextResponse.json({ success: true });
    }

    // Full edit update
    if (edit) {
      await pool.query(`ALTER TABLE hospital_orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`).catch(() => {});

      const total = (items || []).reduce((s: number, i: any) => s + (i.orderedQty || 0) * (parseFloat(i.unitCost) || 0), 0);

      await pool.query(
        `UPDATE hospital_orders SET
           ordered_by=COALESCE($1,ordered_by),
           order_date=COALESCE($2,order_date),
           expected_date=COALESCE($3,expected_date),
           supplier_name=COALESCE($4,supplier_name),
           supplier_email=COALESCE($5,supplier_email),
           supplier_phone=COALESCE($6,supplier_phone),
           notes=COALESCE($7,notes),
           total_amount=$8,
           is_edited=TRUE,
           updatedat=NOW()
         WHERE id=$9`,
        [orderedBy||null, orderDate||null, expectedDate||null,
         supplierName||null, supplierEmail||null, supplierPhone||null,
         notes||null, total, id]
      );

      if (items?.length) {
        // Delete existing items and re-insert
        await pool.query(`DELETE FROM hospital_order_items_new WHERE order_id=$1`, [id]);
        for (const item of items) {
          await pool.query(
            `INSERT INTO hospital_order_items_new
               (id,order_id,item_id,item_name,uom,ordered_qty,unit_cost,total_cost,notes,createdat)
             VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
            [id, item.itemId||null, item.itemName||null, item.uom||null,
             item.orderedQty||0, parseFloat(item.unitCost)||null,
             (item.orderedQty||0)*(parseFloat(item.unitCost)||0), item.notes||null]
          );
          // Sync unit_cost back to inventory
          if (item.itemId && item.unitCost) {
            await pool.query(
              `UPDATE hospital_items SET unit_cost=$1, updatedat=NOW() WHERE id=$2`,
              [parseFloat(item.unitCost), item.itemId]
            ).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PATCH /api/hospital/orders/[id] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
