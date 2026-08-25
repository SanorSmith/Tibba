import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
export async function GET(req: NextRequest) {
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(WS, async () => {
  try {
    const r = await pool.query(
      "SELECT departmentid AS id, name, description AS location, NULL::text AS type FROM departments WHERE workspaceid = $1 ORDER BY name LIMIT 200",
      [WS]
    );
    return NextResponse.json(r.rows);
  } catch (e:any) {
    console.error("Departments error:", e.message);
    return NextResponse.json([]);
  }
  });
}
