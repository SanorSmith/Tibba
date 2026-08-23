import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  try {
    const r = await pool.query(
      `SELECT supplierid AS id, name, contactperson AS contact_person,
              email, phonenumber AS phone, city, country
       FROM suppliers
       WHERE isactive = true
         AND workspaceid = $2
         AND ($1 = '' OR name ILIKE $1 OR city ILIKE $1)
       ORDER BY name LIMIT 100`,
      [`%${search}%`, WS]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("Suppliers error:", e.message);
    return NextResponse.json([]);
  }
  });
}

