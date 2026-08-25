/**
 * Lab goods receipt — recording a delivery and putting it on the shelf.
 *
 * This is the only thing that increases lab stock, the mirror image of the
 * pull panel. It follows the same shape as pharmacy goods receipt: record the
 * delivery, create or top up the batch, raise inventory_stock, and log a
 * RECEIPT row in the shared stock_transactions audit trail.
 *
 * Quantity that goes on the shelf is received minus anything claimed as
 * damaged or short, so a broken delivery doesn't inflate stock. The whole
 * receipt applies in one transaction, and everything is scoped to this lab's
 * own workspace and warehouse.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  labGoodsReceipt,
  labGoodsReceiptItems,
  labClaimDamage,
  labPurchaseOrders,
  labPurchaseOrderItems,
  items,
  itemBatches,
  inventoryStock,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { ensureLabWarehouse } from "@/lib/lims/lab-warehouse";
import { getUser } from "@/lib/user";

interface ReceiptLine {
  itemId?: string;
  itemName?: string;
  uom?: string;
  orderedQty?: number;
  receivedQty?: number;
  returnClaim?: number;
  claimNote?: string;
  unitCost?: number;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  notes?: string;
}

export async function GET(
  req: NextRequest,
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

    const receipts = await db
      .select({
        id: labGoodsReceipt.id,
        receiptnumber: labGoodsReceipt.receiptnumber,
        ordernumber: labGoodsReceipt.ordernumber,
        deliverynotenumber: labGoodsReceipt.deliverynotenumber,
        receivedby: labGoodsReceipt.receivedby,
        receiptdate: labGoodsReceipt.receiptdate,
        suppliername: labGoodsReceipt.suppliername,
        status: labGoodsReceipt.status,
        notes: labGoodsReceipt.notes,
        createdat: labGoodsReceipt.createdat,
        item_count: sql<number>`(SELECT COUNT(*) FROM lab_goods_receipt_items WHERE receipt_id = ${labGoodsReceipt.id})::int`,
      })
      .from(labGoodsReceipt)
      .where(eq(labGoodsReceipt.workspaceid, workspaceid))
      .orderBy(desc(labGoodsReceipt.createdat));

    return NextResponse.json({ receipts });
    });
  } catch (error) {
    console.error("[Lab GRN GET]", error);
    return NextResponse.json({ error: "Failed to load goods receipts" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const {
      orderId,
      orderNumber,
      deliveryNoteNumber,
      receiptDate,
      supplierName,
      supplierEmail,
      notes,
      items: grItems,
    } = body as {
      orderId?: string;
      orderNumber?: string;
      deliveryNoteNumber?: string;
      receiptDate?: string;
      supplierName?: string;
      supplierEmail?: string;
      notes?: string;
      items: ReceiptLine[];
    };

    if (!Array.isArray(grItems) || grItems.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Deliveries land in this lab's own warehouse, created on first use.
    const labWarehouse = await ensureLabWarehouse(workspaceid);

    const anyReceived = grItems.some((i) => Number(i.receivedQty) > 0);
    const allComplete = grItems.every(
      (i) => Number(i.receivedQty ?? 0) >= Number(i.orderedQty ?? i.receivedQty ?? 0)
    );
    const grnStatus = allComplete ? "COMPLETE" : anyReceived ? "PARTIAL" : "PENDING";

    const receiptNumber = `LGRN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
    const receivedBy = user.name ?? user.email ?? user.userid;

    const result = await db.transaction(async (tx) => {
      const [receipt] = await tx
        .insert(labGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: receiptNumber,
          orderid: orderId || null,
          ordernumber: orderNumber || null,
          deliverynotenumber: deliveryNoteNumber || null,
          receivedby: receivedBy,
          receiptdate: receiptDate ? new Date(receiptDate) : new Date(),
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          status: grnStatus as never,
          notes: notes || null,
        })
        .returning();

      const shelved: Array<{ itemName: string; quantity: number; batchNumber: string }> = [];

      for (const line of grItems) {
        const receivedQty = Number(line.receivedQty) || 0;
        const orderedQty = Number(line.orderedQty) || 0;
        const returnClaim = Number(line.returnClaim) || 0;

        await tx.insert(labGoodsReceiptItems).values({
          receiptid: receipt.id,
          itemid: line.itemId || null,
          itemname: line.itemName || null,
          uom: line.uom || null,
          orderedqty: orderedQty,
          receivedqty: receivedQty,
          returnclaim: returnClaim,
          dnregnum: line.lotNumber || null,
          unitcost: line.unitCost != null ? String(line.unitCost) : null,
          batchnumber: line.batchNumber || null,
          lotnumber: line.lotNumber || null,
          expirydate: line.expiryDate ? new Date(line.expiryDate) : null,
          manufacturedate: line.manufactureDate ? new Date(line.manufactureDate) : null,
          notes: line.notes || null,
        });

        if (returnClaim > 0) {
          await tx.insert(labClaimDamage).values({
            receiptid: receipt.id,
            itemid: line.itemId || null,
            itemname: line.itemName || null,
            quantity: returnClaim,
            note: line.claimNote || null,
          });
        }

        // Damaged or short units never reach the shelf.
        const stockQty = Math.max(0, receivedQty - returnClaim);
        if (stockQty <= 0 || !line.itemId) continue;

        // The item must belong to this lab. Without this a delivery could
        // credit stock to another facility's item.
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
        if (!item) throw new Error(`Item not found in this lab's inventory`);

        // Same batch number from the same supplier tops up rather than
        // creating a duplicate shelf entry.
        const batchNumber = line.batchNumber || `AUTO-${Date.now()}`;
        const [existingBatch] = await tx
          .select({ id: itemBatches.id, quantity: itemBatches.quantity })
          .from(itemBatches)
          .where(
            and(
              eq(itemBatches.itemid, line.itemId),
              eq(itemBatches.warehouseid, labWarehouse.id),
              eq(itemBatches.batchnumber, batchNumber)
            )
          )
          .limit(1);

        let batchId: string;
        if (existingBatch) {
          batchId = existingBatch.id;
          await tx
            .update(itemBatches)
            .set({ quantity: (existingBatch.quantity ?? 0) + stockQty })
            .where(eq(itemBatches.id, batchId));
        } else {
          const [newBatch] = await tx
            .insert(itemBatches)
            .values({
              itemid: line.itemId,
              warehouseid: labWarehouse.id,
              batchnumber: batchNumber,
              quantity: stockQty,
              unitcost: line.unitCost != null ? String(line.unitCost) : null,
              expirydate: line.expiryDate ? new Date(line.expiryDate) : null,
              manufacturedate: line.manufactureDate ? new Date(line.manufactureDate) : null,
            })
            .returning();
          batchId = newBatch.id;
        }

        const [existingStock] = await tx
          .select({ id: inventoryStock.id, quantity: inventoryStock.quantity })
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.itemid, line.itemId),
              eq(inventoryStock.warehouseid, labWarehouse.id),
              eq(inventoryStock.batchid, batchId)
            )
          )
          .limit(1);

        if (existingStock) {
          await tx
            .update(inventoryStock)
            .set({ quantity: (existingStock.quantity ?? 0) + stockQty, lastupdated: new Date() })
            .where(eq(inventoryStock.id, existingStock.id));
        } else {
          await tx.insert(inventoryStock).values({
            itemid: line.itemId,
            warehouseid: labWarehouse.id,
            batchid: batchId,
            quantity: stockQty,
            reservedquantity: 0,
          });
        }

        await tx.insert(stockTransactions).values({
          workspaceid: workspaceid,
          itemid: line.itemId,
          warehouseid: labWarehouse.id,
          batchid: batchId,
          transactiontype: "RECEIPT",
          quantity: stockQty,
          referencetype: "LAB_GRN",
          referenceid: receiptNumber,
          notes: notes || `Lab GRN ${receiptNumber}`,
          createdby: user.userid,
        });

        shelved.push({ itemName: item.name, quantity: stockQty, batchNumber });
      }

      // Keep the originating order honest about what has actually arrived.
      if (orderId) {
        const orderLines = await tx
          .select({ itemid: labPurchaseOrderItems.itemid, orderedqty: labPurchaseOrderItems.orderedqty })
          .from(labPurchaseOrderItems)
          .where(eq(labPurchaseOrderItems.orderid, orderId));

        const fullyReceived = orderLines.every((ol) => {
          const line = grItems.find((g) => g.itemId === ol.itemid);
          return line && Number(line.receivedQty ?? 0) >= (ol.orderedqty ?? 0);
        });

        await tx
          .update(labPurchaseOrders)
          .set({
            status: (fullyReceived ? "DELIVERED" : "PARTIALLY_DELIVERED") as never,
            updatedat: new Date(),
          })
          .where(and(eq(labPurchaseOrders.id, orderId), eq(labPurchaseOrders.workspaceid, workspaceid)));
      }

      return { receipt, shelved };
    });

    return NextResponse.json({
      receipt: result.receipt,
      shelved: result.shelved,
      receivedBy,
    });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record goods receipt";
    console.error("[Lab GRN POST]", error);
    const isUserError = /Item not found/.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
