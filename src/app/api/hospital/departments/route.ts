import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/getCurrentUser";
import { withTenant } from "@/lib/db/tenant";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const WS = auth.workspaceId;

  // The facility is named in the WHERE below, but under row-level security
  // naming it is not adopting it: the connection has to carry it or the
  // query matches nothing and the screen renders empty with no error.
  return await withTenant(WS, async () => {

  const search = req.nextUrl.searchParams.get("search") ?? "";
  try {
    const r = await pool.query(
      `SELECT d.departmentid AS id, d.name, d.description AS location, NULL::text AS type,
        (SELECT COUNT(*) FROM hospital_stock s
          WHERE s.department_id = d.departmentid AND s.quantity > 0
            AND s.workspaceid = $2)::int AS item_count
       FROM departments d
       WHERE d.workspaceid = $2
         AND ($1 = '' OR d.name ILIKE $1)
       ORDER BY d.name`,
      [`%${search}%`, WS]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("hospital/departments error:", e.message);
    return NextResponse.json([]);
  }
  });
}
