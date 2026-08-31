/**
 * Single Pharmacy Order API
 *
 * GET   — order detail with items + patient + invoice
 * PATCH — update order status
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  patients,
  drugs,
  invoices,
  invoiceLines,
  users,
} from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { stockLevels } from "@/lib/db/tables/pharmacy-stock";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { asc, gt } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { facilityHandlesOrder } from "@/lib/pharmacy/order-access";
import { pool } from "@/lib/db/pool";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {


    // Fetch order with prescriber and dispenser names
    const [orderData] = await db
      .select({
        order: pharmacyOrders,
        dispensedbyname: sql<string>`dispenser.name`.as('dispensedbyname'),
      })
      .from(pharmacyOrders)
      .leftJoin(sql`users AS dispenser`, sql`dispenser.userid = ${pharmacyOrders.dispensedby}`)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!orderData || !facilityHandlesOrder(orderData.order, workspaceid)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = {
      ...orderData.order,
      prescribername: orderData.order.prescribername,
      dispensedbyname: orderData.dispensedbyname
    };

    // Patient
    let patient = null;
    if (order.patientid) {
      const [p] = await db
        .select()
        .from(patients)
        .where(eq(patients.patientid, order.patientid))
        .limit(1);
      patient = p || null;
    }

    // Items with drug info + inventory price
    const items = await db
      .select({
        itemid: pharmacyOrderItems.itemid,
        orderid: pharmacyOrderItems.orderid,
        drugid: pharmacyOrderItems.drugid,
        drugname: pharmacyOrderItems.drugname,
        dosage: pharmacyOrderItems.dosage,
        quantity: pharmacyOrderItems.quantity,
        unitprice: pharmacyOrderItems.unitprice,
        status: pharmacyOrderItems.status,
        scannedbarcode: pharmacyOrderItems.scannedbarcode,
        scannedat: pharmacyOrderItems.scannedat,
        notes: pharmacyOrderItems.notes,
        batchid: pharmacyOrderItems.batchid,
        // drug details
        drugbarcode: drugs.barcode,
        drugform: drugs.form,
        drugstrength: drugs.strength,
        interaction: sql<string>`COALESCE(${drugs.interaction}, (
          SELECT d2.interaction FROM drugs d2
          WHERE (d2.name ILIKE ${pharmacyOrderItems.drugname}
            OR d2.name ILIKE '%' || ${pharmacyOrderItems.drugname} || '%'
            OR d2.genericname ILIKE '%' || ${pharmacyOrderItems.drugname} || '%')
            AND d2.interaction IS NOT NULL
          LIMIT 1
        ))`.as("interaction"),
        warning: sql<string>`COALESCE(${drugs.warning}, (
          SELECT d2.warning FROM drugs d2
          WHERE (d2.name ILIKE ${pharmacyOrderItems.drugname}
            OR d2.name ILIKE '%' || ${pharmacyOrderItems.drugname} || '%'
            OR d2.genericname ILIKE '%' || ${pharmacyOrderItems.drugname} || '%')
            AND d2.warning IS NOT NULL
          LIMIT 1
        ))`.as("warning"),
        // Best available batch selling price from item_batches (new system)
        bestBatchPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND i.is_active = true
            AND ib.quantity > 0
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("bestBatchPrice"),
        // Fallback: find price by drug NAME (handles duplicate drug records across workspaces)
        nameBasedPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND i.is_active = true
            AND ib.quantity > 0
            AND ib.selling_price IS NOT NULL
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("nameBasedPrice"),
        // Fallback: selling price from item_batches (dual-schema inventory system)
        inventorySellingPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND ib.selling_price IS NOT NULL
          ORDER BY ib.created_at DESC
          LIMIT 1
        )`.as("inventorySellingPrice"),
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrderItems.orderid, orderid));

    // Fetch prices from inventory for items that don't have unitprice
    const itemsWithPrices = await Promise.all(
      items.map(async (item: any) => {
        if (item.unitprice) return item;
        
        // Fetch selling price from inventory
        const priceResult = await pool.query(`
          SELECT ib.selling_price
          FROM items i
          LEFT JOIN (
            SELECT item_id, selling_price, expiry_date, quantity
            FROM item_batches
            WHERE quantity > 0
          ) ib ON ib.item_id = i.id
          WHERE i.name ILIKE $1
            AND i.is_active = true
          ORDER BY ib.expiry_date ASC
          LIMIT 1
        `, [item.drugname]);
        
        return {
          ...item,
          unitprice: priceResult.rows[0]?.selling_price || null
        };
      })
    );

    // Invoice (if exists)
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderid, orderid))
      .limit(1);

    let invLines: any[] = [];
    if (invoice) {
      invLines = await db
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceid, invoice.invoiceid));
    }

    return NextResponse.json({
      order,
      patient,
      items: itemsWithPrices,
      invoice: invoice ? { ...invoice, lines: invLines } : null,
    });
    });
  } catch (error) {
    console.error("[Pharmacy Order Detail GET]", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const body = await request.json();
    const { status, notes, prescriberName, patientid, priority, items: newItems } = body;

    // Fetch existing order
    const [existingOrder] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!existingOrder || existingOrder.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow full edit on PENDING orders
    if (newItems && existingOrder.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only edit items on PENDING orders" },
        { status: 400 }
      );
    }

    const updates: any = { updatedat: new Date() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (prescriberName !== undefined) updates.prescribername = prescriberName;
    if (patientid !== undefined) updates.patientid = patientid;
    if (priority !== undefined) updates.priority = priority;

    const [updated] = await db
      .update(pharmacyOrders)
      .set(updates)
      .where(eq(pharmacyOrders.orderid, orderid))
      .returning();

    // If items are provided, replace all order items
    let allItems: any[] = [];
    if (newItems && Array.isArray(newItems) && newItems.length > 0) {
      // Release stock reservations for old items
      const oldItems = await db
        .select()
        .from(pharmacyOrderItems)
        .where(eq(pharmacyOrderItems.orderid, orderid));

      for (const oldItem of oldItems) {
        if (oldItem.drugid) {
          try {
            const [sl] = await db
              .select()
              .from(stockLevels)
              .where(eq(stockLevels.drugid, oldItem.drugid))
              .limit(1);
            if (sl && sl.reservedquantity >= oldItem.quantity) {
              await db
                .update(stockLevels)
                .set({
                  reservedquantity: sql`${stockLevels.reservedquantity} - ${oldItem.quantity}`,
                  updatedat: new Date(),
                })
                .where(eq(stockLevels.stocklevelid, sl.stocklevelid));
            }
          } catch (e) {
            console.warn(`Failed to release reservation for ${oldItem.drugname}`, e);
          }
        }
      }

      // Delete old items
      await db
        .delete(pharmacyOrderItems)
        .where(eq(pharmacyOrderItems.orderid, orderid));

      // Insert new items
      for (const item of newItems) {
        let unitprice: string | null = null;
        let selectedBatchId: string | null = null;
        let drugid: string | null = null;

        if (item.drugid && item.drugid !== "") {
          const [existingDrug] = await db
            .select({ drugid: drugs.drugid })
            .from(drugs)
            .where(eq(drugs.drugid, item.drugid))
            .limit(1);
          if (existingDrug) drugid = existingDrug.drugid;
        }

        if (drugid) {
          const today = new Date().toISOString().split('T')[0];
          const batches = await db
            .select({
              batchid: drugBatches.batchid,
              lotnumber: drugBatches.lotnumber,
              expirydate: drugBatches.expirydate,
              sellingprice: drugBatches.sellingprice,
              quantity: stockLevels.quantity,
              reservedquantity: stockLevels.reservedquantity,
              stocklevelid: stockLevels.stocklevelid,
            })
            .from(drugBatches)
            .innerJoin(stockLevels, eq(stockLevels.batchid, drugBatches.batchid))
            .where(and(eq(drugBatches.drugid, drugid), gt(drugBatches.expirydate, today)))
            .orderBy(asc(drugBatches.expirydate));

          for (const batch of batches) {
            if ((batch.quantity - batch.reservedquantity) >= item.quantity) {
              selectedBatchId = batch.batchid;
              unitprice = batch.sellingprice;
              break;
            }
          }
        }

        // Build dosage string
        let dosageString = item.dosage || "";
        if (!dosageString && item.doseAmount && item.doseUnit) {
          const parts = [];
          parts.push(`Dose: ${item.doseAmount} ${item.doseUnit}`);
          if (item.route) parts.push(`Route: ${item.route}`);
          if (item.timingDirections) parts.push(`Timing: ${item.timingDirections}`);
          if (item.directionDuration) parts.push(`Duration: ${item.directionDuration}`);
          if (item.additionalInstruction) parts.push(`Instructions: ${item.additionalInstruction}`);
          if (item.usage) parts.push(`Usage: ${item.usage}`);
          if (item.validUntil) parts.push(`Valid Until: ${item.validUntil}`);
          if (item.pharmacistNotes) parts.push(`Pharmacist Notes: ${item.pharmacistNotes}`);
          dosageString = parts.join(" | ");
        }

        const [orderItem] = await db
          .insert(pharmacyOrderItems)
          .values({
            orderid,
            drugid,
            batchid: selectedBatchId,
            drugname: item.drugname,
            dosage: dosageString || null,
            quantity: item.quantity,
            unitprice,
            status: "PENDING" as const,
          })
          .returning();

        allItems.push(orderItem);

        // Reserve stock
        if (drugid) {
          try {
            const [sl] = await db.select().from(stockLevels).where(eq(stockLevels.drugid, drugid)).limit(1);
            if (sl && (sl.quantity - sl.reservedquantity) >= item.quantity) {
              await db
                .update(stockLevels)
                .set({
                  reservedquantity: sql`${stockLevels.reservedquantity} + ${item.quantity}`,
                  updatedat: new Date(),
                })
                .where(eq(stockLevels.stocklevelid, sl.stocklevelid));
            }
          } catch (e) {
            console.warn(`Failed to reserve stock for ${item.drugname}`, e);
          }
        }
      }
    }

    return NextResponse.json({
      order: updated,
      items: allItems.length > 0 ? allItems : undefined,
      message: newItems ? "Order updated with new items" : "Order updated",
    });
    });
  } catch (error) {
    console.error("[Pharmacy Order PATCH]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// DELETE: remove a PENDING order entirely
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING orders can be deleted" },
        { status: 400 }
      );
    }

    // Release stock reservations
    const items = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.orderid, orderid));

    for (const item of items) {
      if (!item.drugid) continue;
      try {
        const [sl] = await db
          .select()
          .from(stockLevels)
          .where(eq(stockLevels.drugid, item.drugid))
          .limit(1);
        if (sl && sl.reservedquantity >= item.quantity) {
          await db
            .update(stockLevels)
            .set({
              reservedquantity: sql`${stockLevels.reservedquantity} - ${item.quantity}`,
              updatedat: new Date(),
            })
            .where(eq(stockLevels.stocklevelid, sl.stocklevelid));
        }
      } catch (e) {
        console.warn(`Failed to release reservation for ${item.drugname}`, e);
      }
    }

    // Delete items first (FK constraint)
    await db.delete(pharmacyOrderItems).where(eq(pharmacyOrderItems.orderid, orderid));
    // Delete order
    await db.delete(pharmacyOrders).where(eq(pharmacyOrders.orderid, orderid));

    return NextResponse.json({ message: "Order deleted successfully" });
    });
  } catch (error) {
    console.error("[Pharmacy Order DELETE]", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
