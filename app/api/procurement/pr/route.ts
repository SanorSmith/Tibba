/**
 * Purchase requisitions — the legacy top-level procurement API.
 *
 * NOTE: `purchase_requisitions` and `purchase_requisition_items` do not exist
 * in this database. These handlers have therefore been failing on every call,
 * independently of anything to do with tenancy. They are scoped here for
 * consistency rather than repaired: the tables need to be created, or these
 * routes and the page at /procurement deleted. Whichever it is, that is a
 * decision about the feature, not about isolation.
 *
 * They previously opened their own connection from a second environment
 * variable, which is the part this fixes.
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
      `SELECT pr.*, w.name AS "warehouseName",
        (SELECT COUNT(*) FROM purchase_requisition_items pri WHERE pri.prid = pr.id)::int AS "itemCount"
       FROM purchase_requisitions pr
       LEFT JOIN warehouses w ON w.id = pr.warehouseid
       ORDER BY pr.createdat DESC`,
    );
    return NextResponse.json(r.rows);
  });
}
