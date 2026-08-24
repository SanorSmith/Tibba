import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { ownerWorkspaceOf } from "@/lib/db/owner-workspace";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  // Only the receipt id is known here, so the owning facility is resolved
  // first — the same circularity as the POS and LIMS record routes.
  const workspaceid = await ownerWorkspaceOf("goods_receipt_note", id);
  if (!workspaceid) {
    return NextResponse.json({ error: "Goods receipt not found" }, { status: 404 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return withTenant(workspaceid, async () => {

  if (status === "COMPLETED") {
    // Get GRN items and increase inventory stock
    const grnRes = await pool.query(`SELECT * FROM goods_receipt_notes WHERE id=$1`, [id]);
    const grn = grnRes.rows[0];
    const items = await pool.query(`SELECT * FROM grn_items WHERE grnid=$1`, [id]);

    for (const item of items.rows) {
      // Create batch
      const batchId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO item_batches (id, item_id, warehouse_id, batch_number, quantity, unit_cost, expiry_date, manufacture_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [batchId, item.itemid, grn.warehouseid, item.batchnumber??null, item.receivedqty, item.unitprice??null, item.expirydate??null, item.manufacturedate??null]
      );
      // Update inventory stock
      await pool.query(
        `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity, last_updated)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
         ON CONFLICT (item_id, warehouse_id) DO UPDATE SET quantity = inventory_stock.quantity + $4, last_updated = NOW()`,
        [item.itemid, grn.warehouseid, batchId, item.receivedqty]
      );
      // Log transaction
      await pool.query(
        `INSERT INTO stock_transactions (id, workspace_id, item_id, warehouse_id, batch_id, transaction_type, quantity, reference_type, reference_id, notes, created_at)
         VALUES (gen_random_uuid(), $6, $1, $2, $3, 'STOCK_IN', $4, 'GRN', $5, 'GRN receipt', NOW())`,
        [item.itemid, grn.warehouseid, batchId, item.receivedqty, id, workspaceid]
      );
    }
  }

  await pool.query(`UPDATE goods_receipt_notes SET status=$1, updatedat=NOW() WHERE id=$2`, [status, id]);
  return NextResponse.json({ success: true });
  });
}
