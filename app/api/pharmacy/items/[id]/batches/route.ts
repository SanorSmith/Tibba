/**
 * Batches of one item.
 *
 * The item in the path decides the facility; the caller has to belong to it.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";
import { getUser } from "@/lib/user";

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

/**
 * Corrects the expiry date of one batch.
 *
 * An expiry date is a fact printed on a physical box, not a preference, so
 * this is deliberately a correction rather than an edit: it demands a written
 * reason and records the change, the person and the previous value in
 * stock_transactions. Nothing here should make it comfortable to walk expired
 * medicine back into sellable state - only possible to fix a date that was
 * recorded wrongly, and visible afterwards that someone did.
 *
 * There was no way to change one at all before this: the batches route
 * exposed GET alone, the modal was a read-only viewer, and no endpoint in the
 * application issued an UPDATE on expiry_date. Stock received through the
 * receive-stock form, which until recently discarded the date entirely, was
 * therefore stuck with whatever it had been filed under.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeRecord("item", id);
  if (auth.error) return auth.error;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const batchId: string | undefined = body?.batchId;
  const expiryDate: string | null =
    body?.expiryDate === null || body?.expiryDate === "" ? null : body?.expiryDate;
  const reason: string = String(body?.reason ?? "").trim();

  if (!batchId) {
    return NextResponse.json({ error: "batchId is required" }, { status: 400 });
  }
  // A correction without a stated reason is an untraceable one. Ten characters
  // is not a high bar, but it rules out "x" and "fix".
  if (reason.length < 10) {
    return NextResponse.json(
      { error: "A reason of at least 10 characters is required" },
      { status: 400 },
    );
  }
  if (expiryDate !== null && Number.isNaN(new Date(expiryDate).getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  }

  return await withTenant(auth.workspaceid, async () => {
    // The batch has to belong to the item named in the path. Without this the
    // caller could pass any batch id and have it authorised against an item
    // they do happen to own.
    const existing = await pool.query(
      `SELECT id, item_id, warehouse_id, batch_number, expiry_date
         FROM item_batches
        WHERE id = $1 AND item_id = $2
        LIMIT 1`,
      [batchId, id],
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const batch = existing.rows[0];
    const previous = batch.expiry_date
      ? new Date(batch.expiry_date).toISOString().slice(0, 10)
      : null;
    const next = expiryDate ? String(expiryDate).slice(0, 10) : null;

    if (previous === next) {
      return NextResponse.json(
        { error: "That is already the expiry date on this batch" },
        { status: 400 },
      );
    }

    await pool.query(
      `UPDATE item_batches SET expiry_date = $1::date WHERE id = $2`,
      [next, batchId],
    );

    // Quantity 0: nothing moved on or off the shelf, so this must not read as
    // a stock movement. It is here because this is the ledger the pharmacy
    // already keeps for its stock, and a correction nobody can find later is
    // not much of a correction.
    await pool.query(
      `INSERT INTO stock_transactions
         (id, workspace_id, item_id, warehouse_id, batch_id, transaction_type,
          quantity, reference_type, reference_id, notes, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'EXPIRY_CORRECTION',
               0, 'item_batch', $5, $6, $7, NOW())`,
      [
        auth.workspaceid,
        batch.item_id,
        batch.warehouse_id,
        batchId,
        batchId,
        `Batch ${batch.batch_number ?? batchId}: expiry ${previous ?? "none"} changed to ${next ?? "none"}. Reason: ${reason}`,
        user.name || user.email || auth.userid,
      ],
    );

    return NextResponse.json({
      ok: true,
      batchId,
      previousExpiry: previous,
      expiryDate: next,
    });
  });
}
