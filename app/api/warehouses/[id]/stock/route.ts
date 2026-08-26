/**
 * Stock held in one warehouse.
 *
 * This route opened its own connection from a second environment variable, so
 * it was invisible to the tenant wrapper and to `DATABASE_URL` alike. It now
 * runs on the shared connection, and the warehouse in the path decides which
 * facility the query belongs to.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `SELECT
        ist.id, ist.quantity, ist.reserved_quantity,
        i.name AS item_name, i.itemcode, i.uom,
        i.reorder_level
      FROM inventory_stock ist
      JOIN items i ON i.id = ist.item_id
      WHERE ist.warehouse_id = $1
        AND i.is_active = true
      ORDER BY i.name`,
      [id],
    );
    return NextResponse.json(r.rows);
  });
}
