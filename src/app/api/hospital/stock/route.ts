import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/getCurrentUser";

const CENTRAL = '00000000-0000-0000-0000-000000000000';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const WS = auth.workspaceId;
  const deptId = req.nextUrl.searchParams.get("department_id") ?? "";
  const r = await pool.query(
    `SELECT i.*, s.id AS stock_id, s.department_id,
      COALESCE(s.quantity,0) AS quantity,
      COALESCE(s.reserved_quantity,0) AS reserved_quantity,
      d.name AS department_name,
      COUNT(DISTINCT b.id)::int AS batch_count,
      MIN(b.expiry_date) AS nearest_expiry
     FROM hospital_items i
     LEFT JOIN hospital_stock s ON s.item_id = i.id
     LEFT JOIN departments d ON d.departmentid = s.department_id
     LEFT JOIN hospital_batches b ON b.item_id = i.id AND b.department_id = s.department_id
     WHERE i.workspace_id = $1 AND i.isactive = true
       AND ($2 = '' OR s.department_id::text = $2)
     GROUP BY i.id, s.id, s.department_id, s.quantity, s.reserved_quantity, d.name
     ORDER BY i.name`,
    [WS, deptId]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const WS = auth.workspaceId;
  const { itemId, departmentId, quantity, batchNumber, lotNumber, serialNumber, unitCost, sellingPrice, expiryDate, manufactureDate, receivedBy, notes } = await req.json();
  if (!itemId || !quantity) return NextResponse.json({ error: "Item and quantity required" }, { status: 400 });
  // Use logged-in user's name if receivedBy not explicitly provided
  const receiver = receivedBy?.trim() || auth.name;

  const deptId = departmentId || CENTRAL; // no dept = goes to hospital central store

  // Upsert stock
  await pool.query(
    `INSERT INTO hospital_stock (id, item_id, department_id, quantity, reserved_quantity, last_updated)
     VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW())
     ON CONFLICT (item_id, department_id) DO UPDATE SET quantity = hospital_stock.quantity + excluded.quantity, last_updated = NOW()`,
    [itemId, deptId, parseInt(quantity)]
  );

  // Insert batch
  if (batchNumber || lotNumber || serialNumber || expiryDate) {
    await pool.query(
      `INSERT INTO hospital_batches (id, item_id, department_id, batch_number, lot_number, serial_number, quantity, unit_cost, expiry_date, manufacture_date, notes, createdat)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [itemId, deptId, batchNumber || null, lotNumber || null, serialNumber || null, parseInt(quantity), parseFloat(unitCost) || null, expiryDate || null, manufactureDate || null, notes || null]
    );
  }

  // Log history
  const item = await pool.query(`SELECT name FROM hospital_items WHERE id = $1`, [itemId]);
  await pool.query(
    `INSERT INTO hospital_history (id, workspace_id, item_id, item_name, department_id, action_type, quantity, created_by, createdat)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'STOCK_IN', $5, $6, NOW())`,
    [WS, itemId, item.rows[0]?.name, deptId, parseInt(quantity), receiver]
  );

  return NextResponse.json({ success: true });
}
