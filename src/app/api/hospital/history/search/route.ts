import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
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
}
