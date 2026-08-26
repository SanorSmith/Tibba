/**
 * Batches of one item.
 *
 * The item in the path decides the facility; the caller has to belong to it.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeRecord("item", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const result = await pool.query(
      `SELECT
        ib.id,
        ib.batch_number     AS "batchNumber",
        COALESCE(ist.quantity, 0) AS quantity,
        ib.unit_cost        AS "unitCost",
        ib.selling_price    AS "sellingPrice",
        ib.expiry_date      AS "expiryDate",
        ib.created_at       AS "createdAt",
        w.name              AS "warehouseName"
      FROM item_batches ib
      LEFT JOIN inventory_stock ist ON ist.batch_id = ib.id
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      WHERE ib.item_id = $1
      ORDER BY ib.expiry_date ASC NULLS LAST`,
      [id],
    );
    return NextResponse.json(result.rows);
  });
}
