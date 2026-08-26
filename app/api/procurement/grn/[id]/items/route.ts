/**
 * Lines on one goods receipt note.
 *
 * This route opened its own connection from a second environment variable and
 * would return any facility's lines to anyone signed in. The receipt in the
 * path now decides the facility, and membership is proved before reading.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("goods_receipt_note", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `SELECT gi.*, i.name AS "itemName", i.uom
       FROM grn_items gi
       LEFT JOIN items i ON i.id = gi.itemid
       WHERE gi.grnid = $1 ORDER BY gi.createdat`,
      [id],
    );
    return NextResponse.json(r.rows);
  });
}
