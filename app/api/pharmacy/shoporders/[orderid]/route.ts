import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { pool } from "@/lib/db/pool";


export async function PATCH(req: NextRequest, { params }: { params: { orderid: string } }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderid } = params;
  const { status } = await req.json();

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const r = await pool.query(
    `UPDATE shop_orders SET status = $1 WHERE orderid = $2 RETURNING *`,
    [status, orderid]
  );

  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(r.rows[0]);
}
