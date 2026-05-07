import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

const ensureTable = () => pool.query(`
  CREATE TABLE IF NOT EXISTS hospital_wastage (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL,
    item_id       UUID REFERENCES hospital_items(id),
    item_name     TEXT,
    department_id UUID,
    quantity      INTEGER NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('WASTAGE','RETURN','DAMAGE','EXPIRED')),
    reason        TEXT,
    batch_number  TEXT,
    recorded_by   TEXT,
    notes         TEXT,
    createdat     TIMESTAMPTZ DEFAULT NOW()
  )
`);

export async function GET(req: NextRequest) {
  const deptId = req.nextUrl.searchParams.get("department_id") ?? "";
  try {
    await ensureTable();
    const r = await pool.query(
      `SELECT w.*, d.name AS department_name
       FROM hospital_wastage w
       LEFT JOIN departments d ON d.departmentid = w.department_id
       WHERE w.workspace_id = $1
         AND ($2 = '' OR w.department_id::text = $2)
       ORDER BY w.createdat DESC
       LIMIT 100`,
      [WS, deptId]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { itemId, itemName, departmentId, quantity, reason, type, recordedBy, notes, batchNumber } = await req.json();
    if (!itemId || !quantity || !type) return NextResponse.json({ error: "Item, quantity and type required" }, { status: 400 });

    await ensureTable();

    // Deduct from stock
    if (departmentId) {
      await pool.query(
        `UPDATE hospital_stock SET quantity = GREATEST(quantity - $1, 0), last_updated = NOW()
         WHERE item_id = $2 AND department_id = $3`,
        [parseInt(quantity), itemId, departmentId]
      );
    }

    // Insert wastage record
    const r = await pool.query(
      `INSERT INTO hospital_wastage (id, workspace_id, item_id, item_name, department_id, quantity, type, reason, batch_number, recorded_by, notes, createdat)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [WS, itemId, itemName || null, departmentId || null, parseInt(quantity), type, reason || null, batchNumber || null, recordedBy || null, notes || null]
    );

    // Log to history
    await pool.query(
      `INSERT INTO hospital_history (id, workspace_id, item_id, item_name, department_id, action_type, quantity, created_by, createdat)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [WS, itemId, itemName || null, departmentId || null, type, parseInt(quantity), recordedBy || null]
    );

    return NextResponse.json(r.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
