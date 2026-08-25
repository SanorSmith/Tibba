/**
 * Lab purchase orders — what this lab has ordered from suppliers.
 *
 * Mirrors the pharmacy procurement orders route. Ordering does not touch
 * stock; stock only moves when the delivery is received (see ../grn).
 * Everything is scoped to the lab's own workspace.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labPurchaseOrders, labPurchaseOrderItems } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

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

    const status = req.nextUrl.searchParams.get("status") ?? "";
    const conditions = [eq(labPurchaseOrders.workspaceid, workspaceid)];
    if (status) conditions.push(eq(labPurchaseOrders.status, status as never));

    const orders = await db
      .select({
        id: labPurchaseOrders.id,
        ordernumber: labPurchaseOrders.ordernumber,
        orderedby: labPurchaseOrders.orderedby,
        orderdate: labPurchaseOrders.orderdate,
        expecteddate: labPurchaseOrders.expecteddate,
        suppliername: labPurchaseOrders.suppliername,
        supplieremail: labPurchaseOrders.supplieremail,
        status: labPurchaseOrders.status,
        totalamount: labPurchaseOrders.totalamount,
        notes: labPurchaseOrders.notes,
        createdat: labPurchaseOrders.createdat,
        item_count: sql<number>`(SELECT COUNT(*) FROM lab_purchase_order_items WHERE order_id = ${labPurchaseOrders.id})::int`,
      })
      .from(labPurchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(labPurchaseOrders.createdat));

    return NextResponse.json({ orders });
    });
  } catch (error) {
    console.error("[Lab PO GET]", error);
    return NextResponse.json({ error: "Failed to load purchase orders" }, { status: 500 });
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
    const { supplierName, supplierEmail, supplierPhone, expectedDate, notes, items: poItems } = body;

    if (!Array.isArray(poItems) || poItems.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }
    if (poItems.some((i: { orderedQty?: number }) => !(Number(i.orderedQty) > 0))) {
      return NextResponse.json({ error: "Every line needs a quantity above zero" }, { status: 400 });
    }

    const orderNumber = `LPO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
    const totalAmount = poItems.reduce(
      (sum: number, i: { orderedQty?: number; unitCost?: number }) =>
        sum + Number(i.orderedQty ?? 0) * Number(i.unitCost ?? 0),
      0
    );

    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(labPurchaseOrders)
        .values({
          workspaceid,
          ordernumber: orderNumber,
          orderedby: user.name ?? user.email ?? user.userid,
          expecteddate: expectedDate ? new Date(expectedDate) : null,
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          supplierphone: supplierPhone || null,
          status: "PENDING",
          notes: notes || null,
          totalamount: String(totalAmount.toFixed(2)),
        })
        .returning();

      await tx.insert(labPurchaseOrderItems).values(
        poItems.map((i: { itemId?: string; itemName?: string; uom?: string; orderedQty?: number; unitCost?: number; notes?: string }) => ({
          orderid: created.id,
          itemid: i.itemId || null,
          itemname: i.itemName || null,
          uom: i.uom || null,
          orderedqty: Number(i.orderedQty ?? 0),
          unitcost: i.unitCost != null ? String(i.unitCost) : null,
          totalcost: String((Number(i.orderedQty ?? 0) * Number(i.unitCost ?? 0)).toFixed(2)),
          notes: i.notes || null,
        }))
      );

      return created;
    });

    return NextResponse.json({ order });
    });
  } catch (error) {
    console.error("[Lab PO POST]", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
