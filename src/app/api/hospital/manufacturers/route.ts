import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  // Supplier/manufacturer lists are facility-private.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(WS, async () => {
  try {
    const r = await pool.query(
      `SELECT id, name, country, contactname AS contact_name, email, phone
       FROM manufacturers
       WHERE workspace_id = $2
         AND ($1 = '' OR name ILIKE $1 OR country ILIKE $1)
       ORDER BY name LIMIT 100`,
      [`%${search}%`, WS]
    );
    return NextResponse.json(r.rows);
  } catch (err: any) {
    // fallback to hospital_manufacturers if manufacturers table schema differs
    try {
      const r2 = await pool.query(
        `SELECT id, name, country, contact_name, email FROM hospital_manufacturers
         WHERE isactive=true AND workspace_id=$2 AND ($1='' OR name ILIKE $1)
         ORDER BY name LIMIT 100`,
        [`%${search}%`, WS]
      );
      return NextResponse.json(r2.rows);
    } catch {
      return NextResponse.json([]);
    }
  }
  });
}
