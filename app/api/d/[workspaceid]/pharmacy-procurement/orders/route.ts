import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyPurchaseOrders,
  pharmacyPurchaseOrderItems,
  items,
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
    const conditions = [eq(pharmacyPurchaseOrders.workspaceid, workspaceid)];
    if (status) {
      conditions.push(eq(pharmacyPurchaseOrders.status, status as any));
    }

    const rows = await db
      .select({
        id: pharmacyPurchaseOrders.id,
        ordernumber: pharmacyPurchaseOrders.ordernumber,
        orderedby: pharmacyPurchaseOrders.orderedby,
        orderdate: pharmacyPurchaseOrders.orderdate,
        expecteddate: pharmacyPurchaseOrders.expecteddate,
        supplierid: pharmacyPurchaseOrders.supplierid,
        suppliername: pharmacyPurchaseOrders.suppliername,
        supplieremail: pharmacyPurchaseOrders.supplieremail,
        supplierphone: pharmacyPurchaseOrders.supplierphone,
        status: pharmacyPurchaseOrders.status,
        notes: pharmacyPurchaseOrders.notes,
        totalamount: pharmacyPurchaseOrders.totalamount,
        isedited: pharmacyPurchaseOrders.isedited,
        cancelreason: pharmacyPurchaseOrders.cancelreason,
        createdat: pharmacyPurchaseOrders.createdat,
        updatedat: pharmacyPurchaseOrders.updatedat,
        item_count: sql<number>`(SELECT COUNT(*) FROM pharmacy_purchase_order_items WHERE order_id = ${pharmacyPurchaseOrders.id})::int`,
      })
      .from(pharmacyPurchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(pharmacyPurchaseOrders.createdat));

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET /pharmacy-procurement/orders error:", e.message);
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
      orderedBy,
      orderDate,
      expectedDate,
      supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      notes,
      items: orderItems,
    } = body;

    if (!orderedBy?.trim())
      return NextResponse.json({ error: "Ordered by is required" }, { status: 400 });
    if (!orderItems?.length)
      return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const orderNum = `PPO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
    const total = orderItems.reduce(
      (s: number, i: any) => s + (i.orderedQty || 0) * (parseFloat(i.unitCost) || 0),
      0
    );

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(pharmacyPurchaseOrders)
        .values({
          workspaceid,
          ordernumber: orderNum,
          orderedby: orderedBy,
          orderdate: orderDate ? new Date(orderDate) : new Date(),
          expecteddate: expectedDate ? new Date(expectedDate) : null,
          supplierid: supplierId || null,
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          supplierphone: supplierPhone || null,
          notes: notes || null,
          totalamount: String(total),
          status: "PENDING",
        })
        .returning();

      for (const item of orderItems) {
        // A line may name a medicine this facility does not stock yet: the
        // search offers the national catalogue alongside the facility's own
        // items, because ordering is how a drug you do not stock becomes one
        // you do. pharmacy_purchase_order_items.item_id is a foreign key to
        // `items`, so the row has to exist before the line can point at it.
        // It is created here, once, at the moment it is first ordered.
        //
        // Matched on name so ordering the same catalogue drug twice reuses the
        // item rather than growing a second one beside it. Stock stays at
        // nothing until the goods receipt arrives - this registers what the
        // pharmacy deals in, not what is on the shelf.
        let itemId: string | null = item.itemId || null;
        if (!itemId && item.globalDrugId) {
          const existing = (await tx.execute(sql`
            SELECT id::text AS id FROM items
             WHERE workspace_id = ${workspaceid}
               AND lower(trim(name)) = lower(trim(${item.itemName ?? ""}))
             LIMIT 1
          `)) as unknown as { id: string }[];

          if (existing.length > 0) {
            itemId = existing[0].id;
          } else {
            const created = (await tx.execute(sql`
              INSERT INTO items (id, workspace_id, item_code, name, generic_name,
                                 item_type, inventory_category, uom, is_active,
                                 created_at, updated_at)
              SELECT gen_random_uuid(), ${workspaceid},
                     COALESCE(NULLIF(gd.nationalcode, ''), 'CAT-' || left(gd.drugid::text, 8)),
                     gd.name, gd.genericname, 'drug', 'pharmacy',
                     COALESCE(NULLIF(gd.unit, ''), 'unit'), true, NOW(), NOW()
                FROM global_drugs gd
               WHERE gd.drugid = ${item.globalDrugId}::uuid
              RETURNING id::text AS id
            `)) as unknown as { id: string }[];
            itemId = created.length > 0 ? created[0].id : null;
          }
        }

        await tx.insert(pharmacyPurchaseOrderItems).values({
          orderid: order.id,
          itemid: itemId,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: item.orderedQty || 0,
          unitcost: item.unitCost ? String(item.unitCost) : null,
          totalcost: String((item.orderedQty || 0) * (parseFloat(item.unitCost) || 0)),
          notes: item.notes || null,
        });

        // Sync price back to items table
        if (itemId && item.unitCost) {
          await tx
            .update(items)
            .set({ updatedat: new Date() })
            .where(eq(items.id, itemId))
            .catch(() => {});
        }
      }

      return order;
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("POST /pharmacy-procurement/orders error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
