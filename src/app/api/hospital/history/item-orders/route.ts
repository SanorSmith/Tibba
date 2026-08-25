import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(req: NextRequest) {
  // Inventory is facility-private: resolve the caller’s facility per request.
  // This was a hardcoded Hospital 1 id, so every facility saw Hospital 1’s stock.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(WS, async () => {
  const itemId = req.nextUrl.searchParams.get("item_id") ?? "";
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  try {
    const r = await pool.query(
      `SELECT
         o.id               AS order_id,
         o.order_number,
         o.order_date,
         o.ordered_by,
         o.supplier_name,
         o.status           AS order_status,
         o.createdat        AS order_createdat,
         oi.ordered_qty,
         oi.uom,
         oi.unit_cost,
         gr.id              AS receipt_id,
         gr.receipt_number,
         gr.receipt_date,
         gr.received_by     AS receipt_received_by,
         gr.status          AS receipt_status,
         COALESCE(gri.received_qty, 0) AS received_qty,
         'Hospital Central Store'::text AS store_name
       FROM hospital_order_items_new oi
       JOIN hospital_orders o
         ON o.id = oi.order_id AND o.workspace_id = $1
       LEFT JOIN hospital_goods_receipt gr
         ON gr.order_id = o.id
       LEFT JOIN hospital_goods_receipt_items gri
         ON gri.receipt_id = gr.id AND gri.item_id = oi.item_id
       WHERE oi.item_id = $2
       ORDER BY o.createdat DESC`,
      [WS, itemId]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
