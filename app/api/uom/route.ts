/**
 * Unit conversions, per facility.
 *
 * `unit_conversions` joins `items`, which belongs to a facility, so this list
 * was showing every hospital's conversions to everyone. The route named no
 * facility at all; it now requires one.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `SELECT uc.*, i.name AS "itemName"
       FROM unit_conversions uc
       LEFT JOIN items i ON i.id = uc.item_id
       ORDER BY i.name, uc.from_uom`,
    );
    return NextResponse.json(r.rows);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireWorkspace(req, body.workspaceid ?? body.workspaceId);
  if (auth.error) return auth.error;

  const { item_id, from_uom, to_uom, factor } = body;
  if (!from_uom || !to_uom || !factor) {
    return NextResponse.json({ error: "from_uom, to_uom and factor required" }, { status: 400 });
  }

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `INSERT INTO unit_conversions (id, item_id, from_uom, to_uom, factor, created_at, workspaceid)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5) RETURNING *`,
      [item_id || null, from_uom, to_uom, factor, auth.workspaceid],
    );
    return NextResponse.json(r.rows[0]);
  });
}
