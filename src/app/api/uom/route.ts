import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getWorkspaceId } from "@/lib/workspace";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest) {
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const r = await pool.query(
    `SELECT uc.*, i.name AS "itemName"
     FROM unit_conversions uc
     LEFT JOIN items i ON i.id = uc.item_id AND i.workspace_id = $1
     WHERE uc.workspaceid = $1
     ORDER BY i.name, uc.from_uom`,
    [WS]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { item_id, from_uom, to_uom, factor } = await req.json();
  if (!from_uom||!to_uom||!factor) return NextResponse.json({ error: "from_uom, to_uom and factor required" }, { status:400 });
  const r = await pool.query(
    `INSERT INTO unit_conversions (id, item_id, from_uom, to_uom, factor, workspaceid, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [item_id||null, from_uom, to_uom, factor, WS]
  );
  return NextResponse.json(r.rows[0]);
}
