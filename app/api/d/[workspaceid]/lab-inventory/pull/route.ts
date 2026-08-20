/**
 * Lab Inventory — manual pull.
 *
 * GET  — history of pulls for this facility, newest first.
 * POST — pull one or more items out of lab stock to run a test.
 *
 * A pull is the only thing that decrements lab stock. It is deliberately
 * manual: the user chooses the items and quantities rather than them being
 * derived from a reagent assignment, because bench work doesn't always match
 * the configured per-test ratio.
 *
 * Every pull is attributable. The signed-in user's id and name are written to
 * lab_consumption_log (created_by / created_by_name) and to the
 * stock_transactions audit row, and the whole pull is applied in a single
 * database transaction so stock and the record of who took it can never
 * disagree. If any line has insufficient stock the entire pull is rejected —
 * a partial pull would leave the bench with an inaccurate picture.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  items,
  itemBatches,
  inventoryStock,
  stockTransactions,
  labConsumptionLog,
} from "@/lib/db/schema";
import { eq, and, sql, desc, isNull, or, gt } from "drizzle-orm";
import { ensureLabWarehouse } from "@/lib/lims/lab-warehouse";
import { getUser } from "@/lib/user";

interface PullLine {
  itemId: string;
  quantity: number;
  batchId?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const history = await db
      .select({
        id: labConsumptionLog.id,
        itemid: labConsumptionLog.itemid,
        itemname: items.name,
        itemcode: items.itemcode,
        uom: items.uom,
        batchid: labConsumptionLog.batchid,
        batchnumber: itemBatches.batchnumber,
        quantity: labConsumptionLog.quantityconsumed,
        sampleref: labConsumptionLog.sampleref,
        patientref: labConsumptionLog.patientref,
        notes: labConsumptionLog.runnotes,
        pulledby: labConsumptionLog.createdby,
        pulledbyname: labConsumptionLog.createdbyname,
        pulledat: labConsumptionLog.createdat,
      })
      .from(labConsumptionLog)
      .innerJoin(items, eq(labConsumptionLog.itemid, items.id))
      .leftJoin(itemBatches, eq(labConsumptionLog.batchid, itemBatches.id))
      .where(eq(labConsumptionLog.workspaceid, workspaceid))
      .orderBy(desc(labConsumptionLog.createdat))
      .limit(100);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[Lab Pull GET]", error);
    return NextResponse.json({ error: "Failed to load pull history" }, { status: 500 });
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

    const body = await request.json();
    const { lines, sampleRef, patientRef, notes } = body as {
      lines: PullLine[];
      sampleRef?: string;
      patientRef?: string;
      notes?: string;
    };

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }
    if (lines.some((l) => !l.itemId || !(l.quantity > 0))) {
      return NextResponse.json({ error: "Every line needs an item and a quantity above zero" }, { status: 400 });
    }

    // This facility's lab warehouse. Stock lives per (item, warehouse, batch),
    // so without it there is nowhere to pull from — created on first use for
    // labs that never had one.
    const labWarehouse = await ensureLabWarehouse(workspaceid);

    const result = await db.transaction(async (tx) => {
      const applied: Array<{ itemId: string; itemName: string; batchId: string | null; quantity: number }> = [];

      for (const line of lines) {
        // The item must belong to this facility and be a lab item — never let
        // a pull reach another workspace's stock or a pharmacy drug.
        const [item] = await tx
          .select({ id: items.id, name: items.name })
          .from(items)
          .where(
            and(
              eq(items.id, line.itemId),
              eq(items.workspaceid, workspaceid),
              eq(items.inventorycategory, "lab")
            )
          )
          .limit(1);

        if (!item) {
          throw new Error(`Item not found in this lab's inventory`);
        }

        // Pick the batch: the caller's choice, otherwise first-expiring-first-out
        // among batches that still have stock, so short-dated reagent is used up
        // before it expires.
        let batchId = line.batchId ?? null;
        if (!batchId) {
          const [fefo] = await tx
            .select({ id: itemBatches.id })
            .from(itemBatches)
            .innerJoin(
              inventoryStock,
              and(
                eq(inventoryStock.batchid, itemBatches.id),
                eq(inventoryStock.warehouseid, labWarehouse.id)
              )
            )
            .where(
              and(
                eq(itemBatches.itemid, line.itemId),
                eq(itemBatches.warehouseid, labWarehouse.id),
                gt(inventoryStock.quantity, 0),
                or(isNull(itemBatches.isquarantined), eq(itemBatches.isquarantined, false))
              )
            )
            .orderBy(sql`${itemBatches.expirydate} ASC NULLS LAST`)
            .limit(1);
          batchId = fefo?.id ?? null;
        }

        // Decrement only if there is genuinely enough, in one statement, so two
        // concurrent pulls cannot both pass a check and oversell the shelf.
        const updated = await tx
          .update(inventoryStock)
          .set({
            quantity: sql`${inventoryStock.quantity} - ${line.quantity}`,
            lastupdated: new Date(),
          })
          .where(
            and(
              eq(inventoryStock.itemid, line.itemId),
              eq(inventoryStock.warehouseid, labWarehouse.id),
              batchId ? eq(inventoryStock.batchid, batchId) : isNull(inventoryStock.batchid),
              sql`${inventoryStock.quantity} >= ${line.quantity}`
            )
          )
          .returning({ id: inventoryStock.id });

        if (updated.length === 0) {
          throw new Error(`Not enough stock of ${item.name} to pull ${line.quantity}`);
        }

        // Who took what, for the bench record.
        await tx.insert(labConsumptionLog).values({
          workspaceid,
          itemid: line.itemId,
          batchid: batchId,
          warehouseid: labWarehouse.id,
          quantityconsumed: String(line.quantity),
          testcount: 1,
          sampleref: sampleRef ?? null,
          patientref: patientRef ?? null,
          runnotes: notes ?? null,
          createdby: user.userid,
          createdbyname: user.name ?? user.email ?? null,
        });

        // Same event in the shared stock audit trail, negative because it left
        // the shelf — matching how dispensing records a decrement.
        await tx.insert(stockTransactions).values({
          itemid: line.itemId,
          warehouseid: labWarehouse.id,
          batchid: batchId,
          transactiontype: "LAB_PULL",
          quantity: -line.quantity,
          referencetype: "LAB_PULL",
          referenceid: sampleRef ?? null,
          patientref: patientRef ?? null,
          notes: notes ?? null,
          createdby: user.userid,
        });

        applied.push({ itemId: line.itemId, itemName: item.name, batchId, quantity: line.quantity });
      }

      return applied;
    });

    return NextResponse.json({
      pulled: result,
      pulledBy: user.name ?? user.email,
      pulledAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record pull";
    console.error("[Lab Pull POST]", error);
    // Stock shortfalls are the user's normal case, not a server fault.
    const isUserError = /Not enough stock|Item not found/.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
