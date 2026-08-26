/**
 * Items at or below reorder level, for one facility's pharmacy.
 *
 * The warehouse lookup had no facility filter, so it gathered every
 * hospital's pharmacy warehouses and reported their stock as one list.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
  const whRes = await pool.query(
    `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
  );
  if (!whRes.rows.length) return NextResponse.json([]);
  const ids = whRes.rows.map((r: any) => r.id);
  const whArray = `{${ids.join(",")}}`;

  const result = await pool.query(
    `SELECT
      i.id,
      i.itemcode,
      i.name,
      i.generic_name      AS "genericName",
      i.uom,
      i.min_level         AS "minLevel",
      i.reorder_level     AS "reorderLevel",
      i.max_level         AS "maxLevel",
      i.manufacturer,
      COALESCE(SUM(ist.quantity), 0)::int AS "currentStock",
      (SELECT ib2.unit_cost FROM item_batches ib2
        WHERE ib2.item_id = i.id
          AND ib2.warehouse_id = ANY($1::uuid[])
          AND ib2.unit_cost IS NOT NULL
        ORDER BY ib2.created_at DESC LIMIT 1) AS "lastUnitCost"
    FROM items i
    LEFT JOIN inventory_stock ist
      ON ist.item_id = i.id
      AND ist.warehouse_id = ANY($1::uuid[])
    WHERE i.is_active = true
      AND (
        i.inventory_category = 'pharmacy'
        OR i.inventory_category = 'pharmacy'
        OR ist.item_id IS NOT NULL
      )
    GROUP BY i.id, i.itemcode, i.name, i.generic_name, i.uom,
             i.min_level, i.reorder_level, i.max_level, i.manufacturer
    HAVING COALESCE(SUM(ist.quantity), 0) <= i.reorder_level
    ORDER BY COALESCE(SUM(ist.quantity), 0) ASC`,
    [whArray]
  );

  return NextResponse.json(result.rows);
  });
}

/**
 * Raises a purchase requisition from the shop list.
 *
 * Two things are wrong here beyond tenancy, both pre-existing:
 * `purchase_requisitions` and `purchase_requisition_items` do not exist in
 * this database, so every call fails; and the warehouse is hardcoded, so a
 * requisition raised by any facility would name one particular warehouse.
 * Scoped here for consistency, not repaired — whether these tables should
 * exist is a decision about the feature.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireWorkspace(req, body.workspaceid ?? body.workspaceId);
  if (auth.error) return auth.error;

  const { items, notes } = body;

  const WAREHOUSE_ID = "22222222-0000-0000-0000-000000000002";
  const prId = crypto.randomUUID();
  const prNumber = `PR-PHARM-${Date.now()}`;

  return await withTenant(auth.workspaceid, async () => {
  await pool.query(
    `INSERT INTO purchase_requisitions
      (id, prnumber, warehouseid, requestedby, status, notes, createdat, updatedat)
     VALUES ($1, $2, $3, 'Pharmacy System', 'draft', $4, NOW(), NOW())`,
    [prId, prNumber, WAREHOUSE_ID, notes ?? "Auto-generated from pharmacy shop list"]
  );

  for (const item of items) {
    await pool.query(
      `INSERT INTO purchase_requisition_items
        (id, prid, itemid, requestedqty, estimatedprice, notes, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        crypto.randomUUID(),
        prId,
        item.itemId,
        item.quantity,
        item.unitCost ?? null,
        item.notes ?? null,
      ]
    );
  }

  return NextResponse.json({ success: true, prId, prNumber });
  });
}