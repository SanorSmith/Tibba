/**
 * Stock adjustment — correcting the shelf when reality and the system differ.
 *
 * Deliveries, pulls and returns explain most movement. Adjustments cover the
 * rest: a stock count that came out different, a spillage, a reagent found
 * expired. Every adjustment needs a reason, because an unexplained change to
 * stock is indistinguishable from an error or a theft.
 *
 * Adjustments are recorded as movements like everything else, so the history
 * still adds up to the current quantity.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, inventoryStock, stockTransactions, warehouses, itemBatches } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { ensureLabWarehouse } from "@/lib/lims/lab-warehouse";
import { getUser } from "@/lib/user";

const REASONS = ["STOCK_COUNT", "SPILLAGE", "EXPIRED", "DAMAGED", "OTHER"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: stockTransactions.id,
        itemname: items.name,
        quantity: stockTransactions.quantity,
        notes: stockTransactions.notes,
        reference: stockTransactions.referenceid,
        createdby: stockTransactions.createdby,
        createdat: stockTransactions.createdat,
      })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemid, items.id))
      .innerJoin(warehouses, eq(stockTransactions.warehouseid, warehouses.id))
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(warehouses.warehousetype, "lab"),
          eq(stockTransactions.transactiontype, "ADJUSTMENT")
        )
      )
      .orderBy(desc(stockTransactions.createdat))
      .limit(100);

    return NextResponse.json({ adjustments: rows, reasons: REASONS });
  } catch (error) {
    console.error("[lab adjust GET]", error);
    return NextResponse.json({ error: "Failed to load adjustments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId, batchId, newQuantity, reason, notes } = await request.json();
    if (!itemId || newQuantity == null) {
      return NextResponse.json({ error: "itemId and newQuantity are required" }, { status: 400 });
    }
    if (Number(newQuantity) < 0) {
      return NextResponse.json({ error: "Stock cannot be negative" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "A reason is required for every adjustment" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ id: items.id, name: items.name })
        .from(items)
        .where(
          and(eq(items.id, itemId), eq(items.workspaceid, workspaceid), eq(items.inventorycategory, "lab"))
        )
        .limit(1);
      if (!item) throw new Error("Item not found in this lab's inventory");

      const labWarehouse = await ensureLabWarehouse(workspaceid, null, tx);

      const [current] = await tx
        .select({ id: inventoryStock.id, quantity: inventoryStock.quantity, batchid: inventoryStock.batchid })
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.itemid, itemId),
            eq(inventoryStock.warehouseid, labWarehouse.id),
            batchId ? eq(inventoryStock.batchid, batchId) : sql`TRUE`
          )
        )
        .limit(1);

      const before = current?.quantity ?? 0;
      const after = Number(newQuantity);
      const delta = after - before;
      if (delta === 0) throw new Error("That is already the recorded quantity");

      if (current) {
        await tx
          .update(inventoryStock)
          .set({ quantity: after, lastupdated: new Date() })
          .where(eq(inventoryStock.id, current.id));
      } else {
        await tx.insert(inventoryStock).values({
          itemid: itemId,
          warehouseid: labWarehouse.id,
          batchid: batchId ?? null,
          quantity: after,
          reservedquantity: 0,
        });
      }

      if (batchId) {
        await tx.update(itemBatches).set({ quantity: after }).where(eq(itemBatches.id, batchId));
      }

      await tx.insert(stockTransactions).values({
        workspaceid: workspaceid,
        itemid: itemId,
        warehouseid: labWarehouse.id,
        batchid: batchId ?? null,
        transactiontype: "ADJUSTMENT",
        quantity: delta,
        referencetype: "LAB_ADJUSTMENT",
        referenceid: reason,
        notes: notes || `${before} → ${after} (${reason})`,
        createdby: user.userid,
      });

      return { item: item.name, before, after, delta };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adjustment failed";
    console.error("[lab adjust POST]", error);
    const isUserError = /not found|no warehouse|already the recorded/i.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
