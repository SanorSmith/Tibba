import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const CENTRAL = '00000000-0000-0000-0000-000000000000'; // hospital central store

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await pool.query(`SELECT * FROM hospital_transfer_items WHERE transfer_id = $1`, [id]);
  return NextResponse.json(items.rows);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { status, receivedBy, sentBy, items, deliveryKey } = await req.json();

    // Update transfer item quantities if admin adjusted them
    if (items?.length) {
      for (const item of items) {
        await pool.query(
          `UPDATE hospital_transfer_items SET quantity=$1 WHERE id=$2`,
          [item.quantity, item.id]
        );
      }
    }

    // Admin dispatches — deduct from hospital central stock
    if (status === "PENDING") {
      const tItems = await pool.query(`SELECT * FROM hospital_transfer_items WHERE transfer_id=$1`, [id]);
      for (const item of tItems.rows) {
        if (!item.item_id) continue;
        await pool.query(
          `UPDATE hospital_stock SET quantity = GREATEST(quantity - $1, 0), last_updated = NOW()
           WHERE item_id = $2 AND department_id = $3`,
          [item.quantity, item.item_id, CENTRAL]
        );
      }
    }

    // Department confirms receipt — validate key, add stock, log history
    if (status === "RECEIVED") {
      const transfer = await pool.query(`SELECT * FROM hospital_transfers WHERE id=$1`, [id]);
      const t = transfer.rows[0];
      if (!t) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });

      // Validate delivery key
      if (t.delivery_key && deliveryKey && t.delivery_key !== deliveryKey.toUpperCase()) {
        return NextResponse.json({ error: "Invalid delivery key" }, { status: 400 });
      }

      const tItems = await pool.query(`SELECT * FROM hospital_transfer_items WHERE transfer_id=$1`, [id]);
      for (const item of tItems.rows) {
        if (!item.item_id) continue;
        await pool.query(
          `INSERT INTO hospital_stock (id, item_id, department_id, quantity, reserved_quantity, last_updated)
           VALUES (gen_random_uuid(),$1,$2,$3,0,NOW())
           ON CONFLICT (item_id, department_id)
           DO UPDATE SET quantity=hospital_stock.quantity+excluded.quantity, last_updated=NOW()`,
          [item.item_id, t.to_department_id, item.quantity]
        );
        await pool.query(
          `INSERT INTO hospital_history
             (id,workspace_id,item_id,item_name,department_id,action_type,quantity,reference_id,created_by,createdat)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'TRANSFER',$5,$6,$7,NOW())`,
          [WS, item.item_id, item.item_name, t.to_department_id, item.quantity, t.transfer_number, receivedBy||null]
        );
      }
    }

    await pool.query(
      `UPDATE hospital_transfers SET
         status      = COALESCE($1, status),
         received_by = COALESCE($2, received_by),
         sent_by     = COALESCE($3, sent_by),
         updatedat   = NOW()
       WHERE id=$4`,
      [status||null, receivedBy||null, sentBy||null, id]
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PATCH /api/hospital/transfers/[id] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
