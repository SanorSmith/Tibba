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

  // Which batch this stock belongs to has to be settled before any of it is
  // written down.
  //
  // This used to look up `item_id AND warehouse_id LIMIT 1` - the first batch
  // of the item in the warehouse, whichever one that happened to be - and then
  // only ever updated its prices. The batch number and expiry date the user
  // typed were destructured out of the request body and then used nowhere at
  // all. So receiving 300 units of a drug whose one existing batch had already
  // expired raised the shelf count to 400 and filed every new unit under the
  // expired lot. The POS went on refusing to dispense it, which was the right
  // call on the wrong data, and the pharmacist was left adding good stock to a
  // shelf that stayed unsellable. A batch is identified by its number and its
  // expiry date, not by being the first row the query returned.
  //
  // Resolving it also has to happen whether or not prices were supplied. This
  // used to sit inside `if (unitCost !== null || sellingPrice !== null)`, so
  // stock received without a price got an inventory_stock row with a null
  // batch_id - invisible to the POS, which reaches stock through item_batches.
  const expiry = expiryDate ? String(expiryDate) : null;
  const receivedQty = parseInt(adjustmentQty);
  let targetBatchId: string | null = batchId ?? null;
  let batchIsNew = false;

  if (!targetBatchId) {
    const conds: string[] = ["item_id = $1", "warehouse_id = $2"];
    const vals: unknown[] = [itemId, warehouseId];
    if (batchNumber) {
      conds.push(`batch_number = $${vals.length + 1}`);
      vals.push(batchNumber);
    }
    // A different expiry date is a different lot. Stock must never be merged
    // into a lot that expires on another day, least of all one already past.
    if (expiry) {
      conds.push(`expiry_date = $${vals.length + 1}::date`);
      vals.push(expiry);
    } else {
      conds.push("expiry_date IS NULL");
    }

    const match = await pool.query(
      `SELECT id FROM item_batches WHERE ${conds.join(" AND ")} LIMIT 1`,
      vals
    );

    if (match.rows.length > 0) {
      targetBatchId = match.rows[0].id;
    } else {
      const created = await pool.query(
        `INSERT INTO item_batches
           (id, item_id, warehouse_id, batch_number, quantity, unit_cost, selling_price, expiry_date)
         VALUES (gen_random_uuid(), $1, $2, $3, GREATEST(0, $4), $5, $6, $7::date)
         RETURNING id`,
        [
          itemId,
          warehouseId,
          batchNumber || `BATCH-${Date.now()}`,
          receivedQty,
          unitCost ?? null,
          sellingPrice ?? null,
          expiry,
        ]
      );
      targetBatchId = created.rows[0].id;
      batchIsNew = true;
    }
  }

  // A batch that already existed takes the received quantity on top of what it
  // held; one just created was inserted carrying it. Keeping item_batches.quantity
  // in step with the shelf matters beyond bookkeeping - the dispense route picks
  // batches with `ib.quantity > 0`, so a batch left at its opening figure while
  // the shelf grew is a batch that stops being dispensable early.
  if (!batchIsNew) {
    await pool.query(
      `UPDATE item_batches
          SET unit_cost     = COALESCE($1, unit_cost),
              selling_price = COALESCE($2, selling_price),
              quantity      = GREATEST(0, quantity + $3)
        WHERE id = $4`,
      [unitCost ?? null, sellingPrice ?? null, receivedQty, targetBatchId]
    );
  }

  await pool.query(
    `INSERT INTO stock_adjustments (id, workspace_id, item_id, warehouse_id, batch_id, quantity, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [adjId, workspaceid, itemId, warehouseId, targetBatchId, receivedQty, reason, createdBy ?? "Pharmacy"]
  );

  // Stock is recorded against the batch it actually belongs to. The old upsert
  // matched `($3::uuid IS NULL OR batch_id = $3)` with a null $3, which matched
  // whatever row happened to be there and poured the new stock into it.
  const checkStock = await pool.query(
    `SELECT id, quantity FROM inventory_stock
      WHERE item_id = $1 AND warehouse_id = $2 AND batch_id IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [itemId, warehouseId, targetBatchId]
  );

  if (checkStock.rows.length > 0) {
    // last_updated was never touched here, so a receive left no trace of when
    // it happened - which made a 300-unit top-up impossible to date afterwards.
    await pool.query(
      `UPDATE inventory_stock
          SET quantity = GREATEST(0, quantity + $1), last_updated = NOW()
        WHERE id = $2`,
      [receivedQty, checkStock.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity, last_updated)
       VALUES (gen_random_uuid(), $1, $2, $3, GREATEST(0, $4), 0, NOW())`,
      [itemId, warehouseId, targetBatchId, receivedQty]
    );
  }

  // Log transaction (use STOCK_IN for positive, STOCK_OUT for negative)
  const transactionType = receivedQty > 0 ? 'STOCK_IN' : 'STOCK_OUT';
  await pool.query(
    `INSERT INTO stock_transactions (id, workspace_id, item_id, warehouse_id, batch_id, transaction_type, quantity, notes, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [crypto.randomUUID(), workspaceid, itemId, warehouseId, targetBatchId, transactionType, Math.abs(receivedQty), reason, createdBy ?? "Pharmacy"]
  );

  return NextResponse.json({ success: true, id: adjId });
  });
}
