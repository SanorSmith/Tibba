/**
 * Returning stock to a supplier.
 *
 * A return physically removes stock, so it decrements inventory and writes a
 * RETURN row to the shared audit trail — the mirror of goods receipt. Sending
 * goods back without reducing stock would leave the shelf overstated.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labVendorReturns, labVendorReturnItems } from "@/lib/db/tables/lab-procurement";
import { items, itemBatches, inventoryStock, stockTransactions } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { ensureLabWarehouse } from "@/lib/lims/lab-warehouse";
import { getUser } from "@/lib/user";

interface ReturnLine {
  itemId: string;
  batchId?: string | null;
  quantity: number;
  unitCost?: number;
  reason?: string;
}

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

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const rows = await db
      .select({
        id: labVendorReturns.id,
        returnnumber: labVendorReturns.returnnumber,
        vendorname: labVendorReturns.vendorname,
        status: labVendorReturns.status,
        reason: labVendorReturns.reason,
        totalvalue: labVendorReturns.totalvalue,
        returnedbyname: labVendorReturns.returnedbyname,
        createdat: labVendorReturns.createdat,
        itemCount: sql<number>`(SELECT COUNT(*) FROM lab_vendor_return_items WHERE return_id = ${labVendorReturns.id})::int`,
      })
      .from(labVendorReturns)
      .where(eq(labVendorReturns.workspaceid, workspaceid))
      .orderBy(desc(labVendorReturns.createdat));

    return NextResponse.json({ returns: rows });
    });
  } catch (error) {
    console.error("[lab returns GET]", error);
    return NextResponse.json({ error: "Failed to load returns" }, { status: 500 });
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

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const body = await request.json();
    const { vendorId, vendorName, reason, notes, lines } = body as {
      vendorId?: string;
      vendorName?: string;
      reason?: string;
      notes?: string;
      lines: ReturnLine[];
    };

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }
    if (lines.some((l) => !l.itemId || !(l.quantity > 0))) {
      return NextResponse.json({ error: "Every line needs an item and a quantity above zero" }, { status: 400 });
    }

    const labWarehouse = await ensureLabWarehouse(workspaceid);

    const returnNumber = `LRTN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const result = await db.transaction(async (tx) => {
      let totalValue = 0;

      const [header] = await tx
        .insert(labVendorReturns)
        .values({
          workspaceid,
          returnnumber: returnNumber,
          vendorid: vendorId || null,
          vendorname: vendorName || null,
          warehouseid: labWarehouse.id,
          status: "SENT",
          reason: reason || null,
          notes: notes || null,
          returnedby: user.userid,
          returnedbyname: user.name ?? user.email ?? null,
        })
        .returning();

      for (const line of lines) {
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
        if (!item) throw new Error("Item not found in this lab's inventory");

        // Guarded in the UPDATE so a return can never take stock negative.
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
              line.batchId ? eq(inventoryStock.batchid, line.batchId) : sql`TRUE`,
              sql`${inventoryStock.quantity} >= ${line.quantity}`
            )
          )
          .returning({ id: inventoryStock.id });

        if (updated.length === 0) {
          throw new Error(`Not enough stock of ${item.name} to return ${line.quantity}`);
        }

        let batchNumber: string | null = null;
        if (line.batchId) {
          const [b] = await tx
            .select({ n: itemBatches.batchnumber })
            .from(itemBatches)
            .where(eq(itemBatches.id, line.batchId))
            .limit(1);
          batchNumber = b?.n ?? null;
        }

        await tx.insert(labVendorReturnItems).values({
          returnid: header.id,
          itemid: line.itemId,
          itemname: item.name,
          batchid: line.batchId || null,
          batchnumber: batchNumber,
          quantity: line.quantity,
          unitcost: line.unitCost != null ? String(line.unitCost) : null,
          reason: line.reason || null,
        });

        await tx.insert(stockTransactions).values({
          workspaceid: workspaceid,
          itemid: line.itemId,
          warehouseid: labWarehouse.id,
          batchid: line.batchId || null,
          transactiontype: "RETURN",
          quantity: -line.quantity,
          referencetype: "LAB_VENDOR_RETURN",
          referenceid: returnNumber,
          notes: reason || null,
          createdby: user.userid,
        });

        totalValue += (line.unitCost ?? 0) * line.quantity;
      }

      await tx
        .update(labVendorReturns)
        .set({ totalvalue: String(totalValue.toFixed(2)) })
        .where(eq(labVendorReturns.id, header.id));

      return { ...header, totalvalue: String(totalValue.toFixed(2)) };
    });

    return NextResponse.json({ return: result });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record return";
    console.error("[lab returns POST]", error);
    return NextResponse.json({ error: message }, { status: /Not enough|not found/i.test(message) ? 400 : 500 });
  }
}
