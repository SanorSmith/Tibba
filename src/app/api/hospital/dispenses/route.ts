import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const deptId = req.nextUrl.searchParams.get("department_id") ?? "";
  const r = await pool.query(
    `SELECT d.*, i.name AS item_name, i.uom, dep.name AS department_name
     FROM hospital_dispenses d
     LEFT JOIN hospital_items i ON i.id = d.item_id
     LEFT JOIN departments dep ON dep.departmentid = d.department_id
     WHERE d.workspace_id = $1
       AND ($2 = '' OR d.department_id::text = $2)
     ORDER BY d.createdat DESC LIMIT 200`,
    [WS, deptId]
  );
  return NextResponse.json(r.rows);
}

const CENTRAL = '00000000-0000-0000-0000-000000000000';

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.itemId || !b.quantity) return NextResponse.json({ error: "Item and quantity required" }, { status: 400 });
  if (!b.reason?.trim()) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  const deptId = b.departmentId || CENTRAL;

  await pool.query(`ALTER TABLE hospital_dispenses ADD COLUMN IF NOT EXISTS reason TEXT`).catch(()=>{});

  // Check stock
  const stock = await pool.query(
    `SELECT quantity FROM hospital_stock WHERE item_id = $1 AND department_id = $2`,
    [b.itemId, deptId]
  );
  const available = stock.rows[0]?.quantity ?? 0;
  if (available < parseInt(b.quantity)) return NextResponse.json({ error: `Insufficient stock. Available: ${available}` }, { status: 400 });

  // Reduce stock
  await pool.query(
    `UPDATE hospital_stock SET quantity = quantity - $1, last_updated = NOW() WHERE item_id = $2 AND department_id = $3`,
    [parseInt(b.quantity), b.itemId, deptId]
  );

  // Save dispense
  const r = await pool.query(
    `INSERT INTO hospital_dispenses (id,workspace_id,item_id,department_id,quantity,dispensed_by,reason,notes,createdat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
    [WS, b.itemId, deptId, parseInt(b.quantity), b.dispensedBy||null, b.reason||null, b.notes||null]
  );

  // Log history
  const item = await pool.query(`SELECT name FROM hospital_items WHERE id = $1`, [b.itemId]);
  await pool.query(
    `INSERT INTO hospital_history (id,workspace_id,item_id,item_name,department_id,action_type,quantity,reference_id,created_by,createdat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,'DISPENSE',$5,$6,$7,NOW())`,
    [WS, b.itemId, item.rows[0]?.name, deptId, parseInt(b.quantity), r.rows[0].id, b.dispensedBy||null]
  );

  return NextResponse.json(r.rows[0]);
}
