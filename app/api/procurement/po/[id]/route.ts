/**
 * Status changes on one purchase order.
 *
 * This route opened its own connection from a second environment variable and
 * would move any facility's order to any status for anyone signed in. The
 * order in the path now decides the facility, and membership is proved before
 * the write.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("purchase_order", id);
  if (auth.error) return auth.error;

  const { status } = await req.json();

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `UPDATE purchase_orders SET status=$1, updatedat=NOW() WHERE id=$2`,
      [status, id],
    );
    if (!r.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  });
}
