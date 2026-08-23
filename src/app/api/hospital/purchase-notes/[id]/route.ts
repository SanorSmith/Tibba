import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  try {
    await pool.query(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS claim_damage INTEGER`).catch(()=>{});
    const note  = await pool.query(`SELECT * FROM hospital_purchase_notes WHERE id=$1 AND workspace_id=$2`, [id, WS]);
    if (note.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const items = await pool.query(`SELECT * FROM hospital_purchase_note_items WHERE note_id=$1 ORDER BY createdat`, [id]);
    return NextResponse.json({ note: note.rows[0], items: items.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  const { status } = await req.json();
  const r = await pool.query(
    `UPDATE hospital_purchase_notes SET status=$1, updatedat=NOW() WHERE id=$2 AND workspace_id=$3`,
    [status, id, WS]
  );
  if (r.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
  });
}
