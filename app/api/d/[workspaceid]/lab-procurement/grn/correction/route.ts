/**
 * Correcting a delivery that was recorded wrongly.
 *
 * A goods receipt is never edited. Mis-keying a delivery and then quietly
 * rewriting it would leave no trace that the shelf count ever changed, and
 * the original receipt is the document the supplier was paid against.
 *
 * Instead a reversal receipt is written: a second record that takes the same
 * quantities back off the shelf, pointing at the original. Both stay in the
 * history, so the correction is visible rather than hidden. A corrected
 * delivery can then simply be received again with the right figures.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labGoodsReceipt, labGoodsReceiptItems } from "@/lib/db/tables/lab-procurement";
import { inventoryStock, stockTransactions, itemBatches } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { ensureLabWarehouse } from "@/lib/lims/lab-warehouse";
import { getUser } from "@/lib/user";

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

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { receiptId, reason } = await request.json();
    if (!receiptId) return NextResponse.json({ error: "receiptId is required" }, { status: 400 });
    if (!reason?.trim()) {
      // A reversal without a stated reason is indistinguishable from an error.
      return NextResponse.json({ error: "A reason is required to reverse a delivery" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [original] = await tx
        .select()
        .from(labGoodsReceipt)
        .where(and(eq(labGoodsReceipt.id, receiptId), eq(labGoodsReceipt.workspaceid, workspaceid)))
        .limit(1);
      if (!original) throw new Error("Delivery not found");
      if (original.isreversal) throw new Error("A reversal cannot itself be reversed");

      const [already] = await tx
        .select({ id: labGoodsReceipt.id })
        .from(labGoodsReceipt)
        .where(eq(labGoodsReceipt.correctionof, receiptId))
        .limit(1);
      if (already) throw new Error("This delivery has already been reversed");

      const lines = await tx
        .select()
        .from(labGoodsReceiptItems)
        .where(eq(labGoodsReceiptItems.receiptid, receiptId));

      const labWarehouse = await ensureLabWarehouse(workspaceid, null, tx);

      const reversalNumber = `LGRN-REV-${Date.now().toString().slice(-6)}`;
      const [reversal] = await tx
        .insert(labGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: reversalNumber,
          orderid: original.orderid,
          ordernumber: original.ordernumber,
          deliverynotenumber: original.deliverynotenumber,
          receivedby: user.name ?? user.email ?? user.userid,
          suppliername: original.suppliername,
          status: "CORRECTION",
          isreversal: true,
          correctionof: receiptId,
          correctionreason: reason,
          correctedby: user.name ?? user.email ?? null,
          correctiontype: "REVERSAL",
          notes: `Reverses ${original.receiptnumber}`,
        })
        .returning();

      const pulledBack: Array<{ item: string; quantity: number }> = [];

      for (const line of lines) {
        const shelved = Math.max(0, (line.receivedqty ?? 0) - (line.returnclaim ?? 0));
        if (shelved <= 0 || !line.itemid) continue;

        // Mirror line on the reversal, quantities negated so the paperwork
        // reads the same way round as the original.
        await tx.insert(labGoodsReceiptItems).values({
          receiptid: reversal.id,
          itemid: line.itemid,
          itemname: line.itemname,
          uom: line.uom,
          orderedqty: line.orderedqty,
          receivedqty: -shelved,
          batchnumber: line.batchnumber,
          expirydate: line.expirydate,
          correctionofitemid: line.id,
        });

        const [batch] = line.batchnumber
          ? await tx
              .select({ id: itemBatches.id })
              .from(itemBatches)
              .where(
                and(
                  eq(itemBatches.itemid, line.itemid),
                  eq(itemBatches.warehouseid, labWarehouse.id),
                  eq(itemBatches.batchnumber, line.batchnumber)
                )
              )
              .limit(1)
          : [undefined];

        // Guarded: if the reagent has already been used, the shelf cannot give
        // it all back, and silently going negative would be worse than failing.
        const updated = await tx
          .update(inventoryStock)
          .set({ quantity: sql`${inventoryStock.quantity} - ${shelved}`, lastupdated: new Date() })
          .where(
            and(
              eq(inventoryStock.itemid, line.itemid),
              eq(inventoryStock.warehouseid, labWarehouse.id),
              batch ? eq(inventoryStock.batchid, batch.id) : sql`TRUE`,
              sql`${inventoryStock.quantity} >= ${shelved}`
            )
          )
          .returning({ id: inventoryStock.id });

        if (updated.length === 0) {
          throw new Error(
            `${line.itemname ?? "An item"} has already been used — only ${shelved} was received and less remains. Adjust stock instead of reversing.`
          );
        }

        if (batch) {
          await tx
            .update(itemBatches)
            .set({ quantity: sql`GREATEST(${itemBatches.quantity} - ${shelved}, 0)` })
            .where(eq(itemBatches.id, batch.id));
        }

        await tx.insert(stockTransactions).values({
          workspaceid: workspaceid,
          itemid: line.itemid,
          warehouseid: labWarehouse.id,
          batchid: batch?.id ?? null,
          transactiontype: "RECEIPT_REVERSAL",
          quantity: -shelved,
          referencetype: "LAB_GRN_REVERSAL",
          referenceid: reversalNumber,
          notes: reason,
          createdby: user.userid,
        });

        pulledBack.push({ item: line.itemname ?? "Item", quantity: shelved });
      }

      return { reversal, pulledBack };
    });

    return NextResponse.json(result);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reverse the delivery";
    console.error("[lab grn correction]", error);
    const isUserError = /not found|already|has already been used|no warehouse|cannot itself/i.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
