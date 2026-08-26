import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { stockTransactions } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";
import { pool } from "@/lib/db/pool";


export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
  // Unfiltered, this collected every hospital's pharmacy warehouses and then
  // listed their adjustments as one history.
  const whRes = await pool.query(`SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`);
  if (!whRes.rows.length) return NextResponse.json([]);
  const whArray = `{${whRes.rows.map((r: any) => r.id).join(",")}}`;

  const result = await pool.query(
    `SELECT
      sa.id,
      sa.quantity            AS "adjustmentQty",
      sa.reason,
      sa.created_by          AS "createdBy",
      sa.created_at          AS "createdAt",
      i.name                 AS "itemName",
      i.itemcode,
      i.uom,
      ib.batch_number        AS "batchNumber",
      w.name                 AS "warehouseName"
    FROM stock_adjustments sa
    LEFT JOIN items i         ON i.id = sa.item_id
    LEFT JOIN item_batches ib ON ib.id = sa.batch_id
    LEFT JOIN warehouses w    ON w.id = sa.warehouse_id
    WHERE sa.warehouse_id = ANY($1::uuid[])
    ORDER BY sa.created_at DESC
    LIMIT 100`,
    [whArray]
  );
  return NextResponse.json(result.rows);
  });
}

export async function POST(req: NextRequest) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { itemId, warehouseId, batchId, adjustmentQty, reason, createdBy, unitCost, sellingPrice, batchNumber, expiryDate, itemType, manufacturer, workspaceid } = body;

  if (!itemId || !warehouseId || adjustmentQty == null || adjustmentQty === "" || !reason)
    return NextResponse.json({ error: "Item, warehouse, quantity and reason are required" }, { status: 400 });

  // The stock rows written below record which facility they belong to, so the
  // facility has to be named and proved. Without it these inserts left the
  // tenant column null, which is why the NOT NULL on those tables is relaxed.
  if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await withTenant(workspaceid, async () => {

  // Verify item exists
  const itemCheck = await pool.query(
    `SELECT id, name FROM items WHERE id = $1`,
    [itemId]
  );
  if (itemCheck.rows.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const adjId = crypto.randomUUID();

  // Update item type and manufacturer if provided
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (itemType) {
    updates.push(`itemtype = $${paramCount++}`);
    values.push(itemType);
  }
  if (manufacturer) {
    updates.push(`manufacturer = $${paramCount++}`);
    values.push(manufacturer);
  }

  if (updates.length > 0) {
    values.push(itemId);
    await pool.query(
      `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  await pool.query(
    `INSERT INTO stock_adjustments (id, workspace_id, item_id, warehouse_id, batch_id, quantity, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [adjId, workspaceid, itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty), reason, createdBy ?? "Pharmacy"]
  );

  // Update or insert inventory_stock
  const checkStock = await pool.query(
    `SELECT id, quantity FROM inventory_stock 
     WHERE item_id = $1 AND warehouse_id = $2 AND ($3::uuid IS NULL OR batch_id = $3)
     LIMIT 1`,
    [itemId, warehouseId, batchId ?? null]
  );

  if (checkStock.rows.length > 0) {
    // Update existing stock
    await pool.query(
      `UPDATE inventory_stock 
       SET quantity = GREATEST(0, quantity + $1)
       WHERE id = $2`,
      [parseInt(adjustmentQty), checkStock.rows[0].id]
    );
  } else {
    // Insert new stock record
    await pool.query(
      `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity)
       VALUES (gen_random_uuid(), $1, $2, $3, GREATEST(0, $4), 0)`,
      [itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty)]
    );
  }

  // Update or create batch with pricing if provided
  let createdBatchId = batchId;
  if (unitCost !== null || sellingPrice !== null) {
    const batchCheck = await pool.query(
      `SELECT id FROM item_batches 
       WHERE item_id = $1 AND warehouse_id = $2
       LIMIT 1`,
      [itemId, warehouseId]
    );

    if (batchCheck.rows.length > 0) {
      // Update existing batch pricing
      await pool.query(
        `UPDATE item_batches 
         SET unit_cost = COALESCE($1, unit_cost),
             selling_price = COALESCE($2, selling_price)
         WHERE id = $3`,
        [unitCost, sellingPrice, batchCheck.rows[0].id]
      );
      createdBatchId = batchCheck.rows[0].id;
    } else {
      // Create new batch with pricing
      const batchResult = await pool.query(
        `INSERT INTO item_batches (id, item_id, warehouse_id, batch_number, quantity, unit_cost, selling_price)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [itemId, warehouseId, `BATCH-${Date.now()}`, parseInt(adjustmentQty), unitCost, sellingPrice]
      );
      createdBatchId = batchResult.rows[0].id;
    }

    // Update inventory_stock with batch_id if it was NULL
    if (createdBatchId && (!batchId || batchId === null)) {
      await pool.query(
        `UPDATE inventory_stock 
         SET batch_id = $1
         WHERE item_id = $2 AND warehouse_id = $3 AND batch_id IS NULL`,
        [createdBatchId, itemId, warehouseId]
      );
    }
  }

  // Log transaction (use STOCK_IN for positive, STOCK_OUT for negative)
  const transactionType = parseInt(adjustmentQty) > 0 ? 'STOCK_IN' : 'STOCK_OUT';
  await pool.query(
    `INSERT INTO stock_transactions (id, workspace_id, item_id, warehouse_id, batch_id, transaction_type, quantity, notes, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [crypto.randomUUID(), workspaceid, itemId, warehouseId, batchId ?? null, transactionType, Math.abs(parseInt(adjustmentQty)), reason, createdBy ?? "Pharmacy"]
  );

  return NextResponse.json({ success: true, id: adjId });
  });
}
