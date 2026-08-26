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

/** The requisition tables carry no facility we can look up, so it is named. */
async function scope(req: NextRequest) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const workspaceid = req.nextUrl.searchParams.get("workspaceid");
  if (!workspaceid) {
    return { error: NextResponse.json({ error: "workspaceid is required" }, { status: 400 }) };
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { workspaceid };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await scope(req);
  if (s.error) return s.error;

  const { id } = await params;
  const { status } = await req.json();

  return await withTenant(s.workspaceid!, async () => {
    const r = await pool.query(
      `UPDATE purchase_requisitions SET status=$1, updatedat=NOW() WHERE id=$2`,
      [status, id],
    );
    if (!r.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await scope(req);
  if (s.error) return s.error;

  const { id } = await params;

  return await withTenant(s.workspaceid!, async () => {
    const r = await pool.query(`SELECT * FROM purchase_requisitions WHERE id=$1`, [id]);
    return NextResponse.json(r.rows[0] ?? null);
  });
}
