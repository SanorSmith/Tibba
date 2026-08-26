/**
 * Status changes on one shop order.
 *
 * This moved any facility's order to any status for anyone signed in. The
 * order now decides the facility, and membership is proved before the write.
 *
 * `params` was also typed as a plain object rather than a promise, which this
 * corrects while the signature is being touched.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderid: string }> },
) {
  const { orderid } = await params;
  const auth = await authorizeRecord("shop_order", orderid);
  if (auth.error) return auth.error;

  const { status } = await req.json();
  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `UPDATE shop_orders SET status = $1 WHERE orderid = $2 RETURNING *`,
      [status, orderid],
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(r.rows[0]);
  });
}
