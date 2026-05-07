import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const type   = req.nextUrl.searchParams.get("type") ?? "stock";
  const deptId = req.nextUrl.searchParams.get("department_id") ?? "";

  if (type === "stock") {
    const r = await pool.query(
      `SELECT i.name, i.itemcode, i.uom, i.unit_cost, i.selling_price, i.reorder_level,
        COALESCE(s.quantity,0) AS total_stock,
        COALESCE(s.reserved_quantity,0) AS reserved_stock,
        COALESCE(s.quantity,0) - COALESCE(s.reserved_quantity,0) AS available,
        d.name AS department_name
       FROM hospital_items i
       LEFT JOIN hospital_stock s ON s.item_id = i.id
       LEFT JOIN departments d ON d.departmentid = s.department_id
       WHERE i.workspace_id=$1 AND i.isactive=true
         AND ($2='' OR s.department_id::text=$2)
       ORDER BY i.name`,
      [WS, deptId]
    );
    return NextResponse.json(r.rows);
  }

  if (type === "consumption") {
    const r = await pool.query(
      `SELECT h.item_name, h.action_type, SUM(h.quantity) AS total_qty,
        COUNT(*) AS tx_count, MAX(h.createdat) AS last_moved, d.name AS department_name
       FROM hospital_history h
       LEFT JOIN departments d ON d.departmentid = h.department_id
       WHERE h.workspace_id=$1 AND h.action_type IN ('DISPENSE','STOCK_OUT')
         AND ($2='' OR h.department_id::text=$2)
       GROUP BY h.item_name, h.action_type, d.name
       ORDER BY total_qty DESC`,
      [WS, deptId]
    );
    return NextResponse.json(r.rows);
  }

  return NextResponse.json([]);
}
