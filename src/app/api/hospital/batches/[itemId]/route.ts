import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  // Batches belong to an item, and the item belongs to a facility. Scope via
  // the item so another hospital's stock cannot be read by guessing an id.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(WS, async () => {
  const r = await pool.query(
    `SELECT b.*, d.name AS department_name
     FROM hospital_batches b
     JOIN hospital_items i ON i.id = b.item_id AND i.workspace_id = $2
     LEFT JOIN departments d ON d.departmentid = b.department_id
     WHERE b.item_id=$1
     ORDER BY b.expiry_date ASC NULLS LAST`,
    [itemId, WS]
  );
  return NextResponse.json(r.rows);
  });
}
