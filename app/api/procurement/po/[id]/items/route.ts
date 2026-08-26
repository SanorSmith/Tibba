/**
 * Lines on one purchase order.
 *
 * This route opened its own connection from a second environment variable and
 * would return any facility's lines to anyone signed in. The order in the path
 * now decides the facility, and membership is proved before reading.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("purchase_order", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `SELECT poi.*, i.name AS "itemName", i.uom
       FROM purchase_order_items poi
       LEFT JOIN items i ON i.id = poi.itemid
       WHERE poi.poid = $1 ORDER BY poi.createdat`,
      [id],
    );
    return NextResponse.json(r.rows);
  });
}
