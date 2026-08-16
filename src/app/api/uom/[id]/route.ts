import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getWorkspaceId } from "@/lib/workspace";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { item_id, from_uom, to_uom, factor } = await req.json();
  const r = await pool.query(
    `UPDATE unit_conversions SET item_id=$1, from_uom=$2, to_uom=$3, factor=$4 WHERE id=$5 AND workspaceid=$6 RETURNING *`,
    [item_id||null, from_uom, to_uom, factor, id, WS]
  );
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await pool.query(`DELETE FROM unit_conversions WHERE id=$1 AND workspaceid=$2`, [id, WS]);
  return NextResponse.json({ success: true });
}
