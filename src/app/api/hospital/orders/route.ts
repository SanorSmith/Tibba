import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  try {
    const r = await pool.query(
      `SELECT o.*,
        (SELECT COUNT(*) FROM hospital_order_items_new oi WHERE oi.order_id = o.id)::int AS item_count
       FROM hospital_orders o
       WHERE o.workspace_id = $1
         AND ($2 = '' OR o.status = $2)
       ORDER BY o.createdat DESC`,
      [WS, status]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("GET /api/hospital/orders error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { orderedBy, orderDate, expectedDate, supplierId, supplierName,
            supplierEmail, supplierPhone, notes, items } = b;

    if (!orderedBy?.trim()) return NextResponse.json({ error: "Ordered by is required" }, { status: 400 });
    if (!items?.length)     return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const orderNum = `ORD-${Date.now().toString().slice(-8)}`;
    const total = items.reduce((s: number, i: any) => s + (i.orderedQty || 0) * (i.unitCost || 0), 0);

    const r = await pool.query(
      `INSERT INTO hospital_orders
         (id,workspace_id,order_number,ordered_by,order_date,expected_date,
          supplier_id,supplier_name,supplier_email,supplier_phone,
          status,notes,total_amount,createdat,updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$11,NOW(),NOW())
       RETURNING *`,
      [WS, orderNum, orderedBy, orderDate||null, expectedDate||null,
       supplierId||null, supplierName||null, supplierEmail||null, supplierPhone||null,
       notes||null, total]
    );

    const orderId = r.rows[0].id;
    for (const item of items) {
      await pool.query(
        `INSERT INTO hospital_order_items_new
           (id,order_id,item_id,item_name,uom,ordered_qty,unit_cost,total_cost,notes,createdat)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [orderId, item.itemId||null, item.itemName||null, item.uom||null,
         item.orderedQty||0, item.unitCost||null,
         (item.orderedQty||0)*(item.unitCost||0), item.notes||null]
      );
      // Sync price back to inventory
      if (item.itemId && item.unitCost) {
        await pool.query(
          `UPDATE hospital_items SET unit_cost=$1, updatedat=NOW() WHERE id=$2`,
          [parseFloat(item.unitCost), item.itemId]
        ).catch(() => {});
      }
    }

    return NextResponse.json(r.rows[0]);
  } catch (e: any) {
    console.error("POST /api/hospital/orders error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
