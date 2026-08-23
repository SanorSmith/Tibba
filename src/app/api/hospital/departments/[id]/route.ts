import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Departments are per-facility, so an id from another hospital reads as null.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  try {
    const r = await pool.query(
      `SELECT departmentid AS id, name, description AS location, NULL::text AS type
       FROM departments WHERE departmentid = $1 AND workspaceid = $2`,
      [id, WS]
    );
    return NextResponse.json(r.rows[0] ?? null);
  } catch (e: any) {
    return NextResponse.json(null);
  }
  });
}
