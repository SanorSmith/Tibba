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
  const type = req.nextUrl.searchParams.get("type") ?? "item_name"; // item_name | item_number | order_number
  const q    = req.nextUrl.searchParams.get("q")    ?? "";

  if (!q.trim()) return NextResponse.json({ type, results: [] });

  try {
    if (type === "order_number") {
      const r = await pool.query(
        `SELECT o.*,
           (SELECT COUNT(*) FROM hospital_order_items_new oi WHERE oi.order_id = o.id)::int AS item_count
         FROM hospital_orders o
         WHERE o.workspace_id = $1
           AND o.order_number ILIKE $2
         ORDER BY o.createdat DESC
         LIMIT 20`,
        [WS, `%${q}%`]
      );
      return NextResponse.json({ type: "order", results: r.rows });
    }

    const field = type === "item_number" ? "itemcode" : "name";
    const r = await pool.query(
      `SELECT id, name, generic_name, itemcode, itemtype, uom, manufacturer, supplier_name, unit_cost, selling_price, isactive
       FROM hospital_items
       WHERE workspace_id = $1
         AND ${field} ILIKE $2
         AND isactive = true
       ORDER BY name
       LIMIT 20`,
      [WS, `%${q}%`]
    );
    return NextResponse.json({ type: "item", results: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
