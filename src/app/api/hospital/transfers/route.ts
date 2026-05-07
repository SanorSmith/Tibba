import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const deptId = req.nextUrl.searchParams.get("department_id") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const r = await pool.query(
    `SELECT t.*, d.name AS department_name,
      (SELECT COUNT(*) FROM hospital_transfer_items ti WHERE ti.transfer_id = t.id)::int AS item_count
     FROM hospital_transfers t
     LEFT JOIN departments d ON d.departmentid = t.to_department_id
     WHERE t.workspace_id = $1
       AND ($2 = '' OR t.to_department_id::text = $2)
       AND ($3 = '' OR t.status = $3)
     ORDER BY t.createdat DESC`,
    [WS, deptId, status]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { toDepartmentId, sentBy, notes, items, isRequest } = await req.json();
  if (!toDepartmentId || !items?.length) return NextResponse.json({ error: "Department and items required" }, { status: 400 });

  await pool.query(`ALTER TABLE hospital_transfers ADD COLUMN IF NOT EXISTS delivery_key VARCHAR(8)`).catch(()=>{});

  const tNum = `TRF-${Date.now().toString().slice(-8)}`;
  const transferStatus = isRequest ? 'REQUESTED' : 'PENDING';
  const deliveryKey = Math.random().toString(36).substring(2, 8).toUpperCase();

  const r = await pool.query(
    `INSERT INTO hospital_transfers (id, workspace_id, transfer_number, to_department_id, sent_by, status, notes, delivery_key, createdat, updatedat)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
    [WS, tNum, toDepartmentId, sentBy || null, transferStatus, notes || null, deliveryKey]
  );
  const transferId = r.rows[0].id;

  for (const item of items) {
    await pool.query(
      `INSERT INTO hospital_transfer_items (id, transfer_id, item_id, item_name, quantity, createdat)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
      [transferId, item.itemId, item.itemName || null, item.quantity || 0]
    );
  }
  return NextResponse.json(r.rows[0]);
}
