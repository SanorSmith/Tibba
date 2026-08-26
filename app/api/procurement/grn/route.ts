/**
 * Goods receipt notes for one facility.
 *
 * This route opened its own connection from a second environment variable and
 * listed every facility's receipts to anyone signed in. It now runs on the
 * shared connection and requires the facility to be named.
 *
 * The caller must pass `?workspaceid=`. Defaulting to "no facility" would make
 * the list come back empty once row-level security is enforcing — a page that
 * looks fine and quietly shows nothing. An explicit 400 says what is wrong.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { pool } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceid = req.nextUrl.searchParams.get("workspaceid");
  if (!workspaceid) {
    return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await withTenant(workspaceid, async () => {
    const r = await pool.query(
      `SELECT g.*, v.name AS "vendorName", w.name AS "warehouseName"
       FROM goods_receipt_notes g
       LEFT JOIN vendors v ON v.id::text = g.vendorid::text
       LEFT JOIN warehouses w ON w.id = g.warehouseid
       ORDER BY g.createdat DESC`,
    );
    return NextResponse.json(r.rows);
  });
}
