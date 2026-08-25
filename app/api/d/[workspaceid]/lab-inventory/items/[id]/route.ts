/**
 * A single lab item — full detail, and editing.
 *
 * Items are deactivated rather than deleted: deliveries, pulls and stock
 * movements all reference them, and removing the row would orphan that
 * history.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { items, itemBatches, inventoryStock, stockTransactions, warehouses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  try {
    const { workspaceid, id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Everything below runs with this facility's identity on the connection,
    // so row-level security scopes it in the database rather than relying on
    // each query carrying the right filter.
    return await withTenant(workspaceid, async () => {

    const [item] = await db
      .select()
      .from(items)
      .where(
        and(eq(items.id, id), eq(items.workspaceid, workspaceid), eq(items.inventorycategory, "lab"))
      )
      .limit(1);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const batches = await db
      .select({
        id: itemBatches.id,
        batchnumber: itemBatches.batchnumber,
        quantity: itemBatches.quantity,
        unitcost: itemBatches.unitcost,
        expirydate: itemBatches.expirydate,
        isquarantined: itemBatches.isquarantined,
      })
      .from(itemBatches)
      .where(eq(itemBatches.itemid, id))
      .orderBy(itemBatches.expirydate);

    const movements = await db
      .select({
        id: stockTransactions.id,
        type: stockTransactions.transactiontype,
        quantity: stockTransactions.quantity,
        referencetype: stockTransactions.referencetype,
        referenceid: stockTransactions.referenceid,
        createdat: stockTransactions.createdat,
        warehouse: warehouses.name,
      })
      .from(stockTransactions)
      .leftJoin(warehouses, eq(stockTransactions.warehouseid, warehouses.id))
      .where(eq(stockTransactions.itemid, id))
      .orderBy(desc(stockTransactions.createdat))
      .limit(50);

    const stock = await db
      .select({ quantity: inventoryStock.quantity, warehouse: warehouses.name })
      .from(inventoryStock)
      .leftJoin(warehouses, eq(inventoryStock.warehouseid, warehouses.id))
      .where(eq(inventoryStock.itemid, id));

    return NextResponse.json({ item, batches, movements, stock });
    });
  } catch (error) {
    console.error("[lab item GET]", error);
    return NextResponse.json({ error: "Failed to load item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  try {
    const { workspaceid, id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Everything below runs with this facility's identity on the connection,
    // so row-level security scopes it in the database rather than relying on
    // each query carrying the right filter.
    return await withTenant(workspaceid, async () => {

    const b = await request.json();
    const [updated] = await db
      .update(items)
      .set({
        name: b.name ?? undefined,
        itemcode: b.itemcode ?? undefined,
        uom: b.uom ?? undefined,
        manufacturer: b.manufacturer ?? undefined,
        barcode: b.barcode ?? undefined,
        reorderlevel: b.reorderlevel ?? undefined,
        minlevel: b.minlevel ?? undefined,
        maxlevel: b.maxlevel ?? undefined,
        criticalreagent: b.criticalreagent ?? undefined,
        analyzercompat: b.analyzercompat ?? undefined,
        isactive: b.isactive ?? undefined,
        updatedat: new Date(),
      })
      .where(
        and(eq(items.id, id), eq(items.workspaceid, workspaceid), eq(items.inventorycategory, "lab"))
      )
      .returning();

    if (!updated) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ item: updated });
    });
  } catch (error) {
    console.error("[lab item PATCH]", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
