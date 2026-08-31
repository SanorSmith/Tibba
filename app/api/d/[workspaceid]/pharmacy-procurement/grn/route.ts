import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyGoodsReceipt,
  pharmacyGoodsReceiptItems,
  pharmacyClaimDamage,
  pharmacyPurchaseOrders,
  pharmacyPurchaseOrderItems,
  itemBatches,
  inventoryStock,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  // This route had no authentication at all: the facility's data was
  // served to anyone who could type the URL. Who you are, whether you
  // belong here, and only then the data.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await withTenant(workspaceid, async () => {
  const status = req.nextUrl.searchParams.get("status") ?? "";

  try {
    const conditions: any[] = [eq(pharmacyGoodsReceipt.workspaceid, workspaceid)];
    if (status) {
      conditions.push(eq(pharmacyGoodsReceipt.status, status as any));
    }

    const rows = await db
      .select({
        id: pharmacyGoodsReceipt.id,
        receiptnumber: pharmacyGoodsReceipt.receiptnumber,
        orderid: pharmacyGoodsReceipt.orderid,
        ordernumber: pharmacyGoodsReceipt.ordernumber,
        deliverynotenumber: pharmacyGoodsReceipt.deliverynotenumber,
        receivedby: pharmacyGoodsReceipt.receivedby,
        receiptdate: pharmacyGoodsReceipt.receiptdate,
        suppliername: pharmacyGoodsReceipt.suppliername,
        supplieremail: pharmacyGoodsReceipt.supplieremail,
        status: pharmacyGoodsReceipt.status,
        notes: pharmacyGoodsReceipt.notes,
        isreversal: pharmacyGoodsReceipt.isreversal,
        correctiontype: pharmacyGoodsReceipt.correctiontype,
        createdat: pharmacyGoodsReceipt.createdat,
        item_count: sql<number>`(SELECT COUNT(*) FROM pharmacy_goods_receipt_items WHERE receipt_id = ${pharmacyGoodsReceipt.id})::int`,
      })
      .from(pharmacyGoodsReceipt)
      .where(and(...conditions))
      .orderBy(desc(pharmacyGoodsReceipt.createdat));

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET /pharmacy-procurement/grn error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  // This route had no authentication at all: the facility's data was
  // served to anyone who could type the URL. Who you are, whether you
  // belong here, and only then the data.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await withTenant(workspaceid, async () => {

  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      deliveryNoteNumber,
      receivedBy,
      receiptDate,
      supplierName,
      supplierEmail,
      notes,
      items: grItems,
      warehouseId,
    } = body;

    if (!receivedBy?.trim())
      return NextResponse.json({ error: "Received by is required" }, { status: 400 });
    if (!grItems?.length)
      return NextResponse.json({ error: "No items provided" }, { status: 400 });

    const allComplete = grItems.every(
      (i: any) => parseInt(i.receivedQty) >= parseInt(i.orderedQty || i.receivedQty)
    );
    const anyReceived = grItems.some((i: any) => parseInt(i.receivedQty) > 0);
    const grnStatus = allComplete ? "COMPLETE" : anyReceived ? "PARTIAL" : "PENDING";

    const receiptNum = `PGRN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    // Where received stock goes. The client sends a warehouse, but when it
    // sends none the old code simply skipped writing stock rather than saying
    // so, so fall back to this facility's own pharmacy warehouse. If there
    // isn't one, receiving fails loudly below instead of quietly succeeding.
    const warehouseFallback = (await db.execute(sql`
      SELECT id::text AS id FROM warehouses
       WHERE workspace_id = ${workspaceid}
         AND warehouse_type = 'pharmacy'
         AND is_active = true
       ORDER BY created_at
       LIMIT 1
    `)) as unknown as { id: string }[];
    const stockWarehouseId: string | null =
      warehouseId || warehouseFallback[0]?.id || null;

    const result = await db.transaction(async (tx) => {
      // 1. Insert goods receipt header
      const [receipt] = await tx
        .insert(pharmacyGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: receiptNum,
          orderid: orderId || null,
          ordernumber: orderNumber || null,
          deliverynotenumber: deliveryNoteNumber || null,
          receivedby: receivedBy,
          receiptdate: receiptDate ? new Date(receiptDate) : new Date(),
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          status: grnStatus as any,
          notes: notes || null,
        })
        .returning();

      const shortItems: any[] = [];
      const extraItems: any[] = [];

      // 2. Process each item
      for (const item of grItems) {
        const receivedQty = parseInt(item.receivedQty) || 0;
        const orderedQty = parseInt(item.orderedQty) || 0;
        const returnClaim = parseInt(item.returnClaim) || 0;

        // What these goods are, as far as inventory is concerned.
        //
        // Stock was written only `if (stockQty > 0 && item.itemId &&
        // warehouseId)`. Both can be null, and when either was, the block was
        // skipped in silence: the receipt still saved, the order still went to
        // DELIVERED, and nothing reached the shelf. PPO-20260831-4288 took in
        // 100 units of Carisoprodol at Ali Pharma that way and left the
        // inventory reading exactly as before, with no error anywhere.
        //
        // A line arrives with no item id when the order named a medicine the
        // facility does not stock. It has physically been delivered, so it has
        // to land somewhere: found by name, or created - taking the generic
        // name and unit from the catalogue when the name matches one.
        let lineItemId: string | null = item.itemId || null;

        if (!lineItemId && item.itemName) {
          const found = (await tx.execute(sql`
            SELECT id::text AS id FROM items
             WHERE workspace_id = ${workspaceid}
               AND lower(trim(name)) = lower(trim(${item.itemName}))
             LIMIT 1
          `)) as unknown as { id: string }[];

          if (found.length > 0) {
            lineItemId = found[0].id;
          } else {
            const catalogue = (await tx.execute(sql`
              SELECT genericname, unit FROM global_drugs
               WHERE isactive = true
                 AND lower(trim(name)) = lower(trim(${item.itemName}))
               LIMIT 1
            `)) as unknown as { genericname: string | null; unit: string | null }[];

            const generic = catalogue[0]?.genericname ?? null;
            const unit = item.uom || catalogue[0]?.unit || "unit";

            const created = (await tx.execute(sql`
              INSERT INTO items (id, workspace_id, item_code, name, generic_name,
                                 item_type, inventory_category, uom, is_active,
                                 created_at, updated_at)
              VALUES (gen_random_uuid(), ${workspaceid},
                      ${"GRN-" + Date.now().toString().slice(-8)},
                      ${item.itemName}, ${generic}, 'drug', 'pharmacy',
                      ${unit}, true, NOW(), NOW())
              RETURNING id::text AS id
            `)) as unknown as { id: string }[];

            lineItemId = created[0]?.id ?? null;
          }
        }

        // Insert receipt item
        await tx.insert(pharmacyGoodsReceiptItems).values({
          receiptid: receipt.id,
          itemid: lineItemId,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: orderedQty,
          receivedqty: receivedQty,
          returnclaim: returnClaim,
          dnregnum: item.dnRegNum || null,
          unitcost: item.unitCost ? String(item.unitCost) : null,
          batchnumber: item.batchNumber || null,
          lotnumber: item.lotNumber || null,
          expirydate: item.expiryDate ? new Date(item.expiryDate) : null,
          manufacturedate: item.manufactureDate ? new Date(item.manufactureDate) : null,
          notes: item.notes || null,
        });

        // Insert claim/damage if any
        if (returnClaim > 0) {
          await tx.insert(pharmacyClaimDamage).values({
            receiptid: receipt.id,
            itemid: lineItemId,
            itemname: item.itemName || null,
            quantity: returnClaim,
            note: item.claimNote || null,
          });
        }

        // Track short/extra
        if (orderedQty > 0 && receivedQty < orderedQty) {
          shortItems.push({ itemName: item.itemName, ordered: orderedQty, received: receivedQty, missing: orderedQty - receivedQty });
        }
        if (orderedQty > 0 && receivedQty > orderedQty) {
          extraItems.push({ itemName: item.itemName, ordered: orderedQty, received: receivedQty, extra: receivedQty - orderedQty });
        }

        // Stock quantity = received minus claimed
        const stockQty = Math.max(0, receivedQty - returnClaim);

        // Goods have been received. If they cannot be put anywhere, the receipt
        // is wrong and the whole transaction is abandoned - recording a
        // delivery that adds no stock is the failure this replaces.
        if (stockQty > 0 && (!lineItemId || !stockWarehouseId)) {
          throw new Error(
            `Cannot receive ${item.itemName ?? "item"}: ` +
              (!lineItemId
                ? "it could not be matched to an inventory item."
                : "this facility has no pharmacy warehouse to receive into.")
          );
        }

        if (stockQty > 0 && lineItemId && stockWarehouseId) {
          // Find or create batch
          const batchNum = item.batchNumber || `AUTO-${Date.now()}`;
          const existingBatches = await tx
            .select()
            .from(itemBatches)
            .where(
              and(
                eq(itemBatches.itemid, lineItemId),
                eq(itemBatches.batchnumber, batchNum)
              )
            )
            .limit(1);

          let batchId: string;
          if (existingBatches.length > 0) {
            batchId = existingBatches[0].id;
            await tx
              .update(itemBatches)
              .set({
                quantity: (existingBatches[0].quantity || 0) + stockQty,
                ...(item.unitprice && { sellingprice: String(item.unitprice) }),
              })
              .where(eq(itemBatches.id, batchId));
          } else {
            const [newBatch] = await tx
              .insert(itemBatches)
              .values({
                itemid: lineItemId,
                warehouseid: stockWarehouseId,
                batchnumber: batchNum,
                quantity: stockQty,
                unitcost: item.unitCost ? String(item.unitCost) : null,
                sellingprice: item.unitprice ? String(item.unitprice) : null,
                expirydate: item.expiryDate ? new Date(item.expiryDate) : null,
                manufacturedate: item.manufactureDate ? new Date(item.manufactureDate) : null,
              })
              .returning();
            batchId = newBatch.id;
          }

          // Find or create inventory stock
          const existingStock = await tx
            .select()
            .from(inventoryStock)
            .where(
              and(
                eq(inventoryStock.itemid, lineItemId),
                eq(inventoryStock.warehouseid, stockWarehouseId),
                eq(inventoryStock.batchid, batchId)
              )
            )
            .limit(1);

          if (existingStock.length > 0) {
            await tx
              .update(inventoryStock)
              .set({
                quantity: (existingStock[0].quantity || 0) + stockQty,
                lastupdated: new Date(),
              })
              .where(eq(inventoryStock.id, existingStock[0].id));
          } else {
            await tx.insert(inventoryStock).values({
              itemid: lineItemId,
              warehouseid: stockWarehouseId,
              batchid: batchId,
              quantity: stockQty,
              reservedquantity: 0,
            });
          }

          // Create stock transaction
          await tx.insert(stockTransactions).values({
            workspaceid: workspaceid,
            itemid: lineItemId,
            warehouseid: stockWarehouseId,
            batchid: batchId,
            transactiontype: "RECEIPT",
            quantity: stockQty,
            referencetype: "GRN",
            referenceid: receiptNum,
            patientref: null,
            notes: notes || `GRN ${receiptNum}`,
            createdby: receivedBy,
          });
        }
      }

      // 3. Update purchase order status if order-based
      if (orderId) {
        const allOrderItems = await tx
          .select()
          .from(pharmacyPurchaseOrderItems)
          .where(eq(pharmacyPurchaseOrderItems.orderid, orderId));

        // Check if all items fully received across all GRNs
        const allItemsReceived = allOrderItems.every((oi) => {
          const receivedItem = grItems.find((gi: any) => gi.itemId === oi.itemid);
          return receivedItem && parseInt(receivedItem.receivedQty) >= (oi.orderedqty || 0);
        });

        const newOrderStatus = allItemsReceived ? "DELIVERED" : "PARTIALLY_DELIVERED";
        await tx
          .update(pharmacyPurchaseOrders)
          .set({
            status: newOrderStatus as any,
            updatedat: new Date(),
          })
          .where(eq(pharmacyPurchaseOrders.id, orderId));
      }

      return { receipt, grnStatus, shortItems, extraItems };
    });

    return NextResponse.json({
      ...result.receipt,
      status: result.grnStatus,
      shortItems: result.shortItems,
      extraItems: result.extraItems,
    });
  } catch (e: any) {
    console.error("POST /pharmacy-procurement/grn error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
