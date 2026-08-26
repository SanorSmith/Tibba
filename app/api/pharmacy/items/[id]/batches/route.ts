import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { pool } from "@/lib/db/pool";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
    [id]
  );

  return NextResponse.json(result.rows);
}
