/**
 * Lab Inventory API
 * GET — lab reagent/consumable inventory with stock levels, low stock alerts
 * POST — trigger auto-reorder for low stock items
 *
 * Mirrors app/api/d/[workspaceid]/pharmacy-inventory/route.ts, scoped to
 * warehouses.warehousetype = 'lab' instead of 'pharmacy'. Lab items are
 * items rows with inventorycategory = 'lab' and drugid = null — they never
 * touch the drugs table, so this inventory is entirely separate from
 * Pharmacy's even though both live in the same `items` table.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  items,
  itemBatches,
  inventoryStock,
  warehouses,
  warehouseSections,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, sql, desc, and, or, like } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

const FALLBACK_REORDER_THRESHOLD = 10;
const DEFAULT_REORDER_QUANTITY = 100;

function getEffectiveReorderLevel(item: { reorderlevel: number | null }): number {
  return item.reorderlevel ?? FALLBACK_REORDER_THRESHOLD;
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all, low, outofstock

    const searchConditions = search
      ? or(
          like(items.name, `%${search}%`),
          like(items.itemcode, `%${search}%`),
          like(items.genericname, `%${search}%`)
        )
      : undefined;

    const allItems = await db
      .select({
        itemid: items.id,
        name: items.name,
        genericname: items.genericname,
        itemType: items.itemtype,
        itemcode: items.itemcode,
        uom: items.uom,
        barcode: items.barcode,
        manufacturer: items.manufacturer,
        isactive: items.isactive,
        reorderlevel: items.reorderlevel,
        inventorycategory: items.inventorycategory,
        criticalreagent: items.criticalreagent,
        analyzercompat: items.analyzercompat,
        totalStock: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
      })
      .from(items)
      .leftJoin(inventoryStock, eq(items.id, inventoryStock.itemid))
      .where(
        searchConditions
          ? and(eq(items.workspaceid, workspaceid), eq(items.inventorycategory, "lab"), searchConditions)
          : and(eq(items.workspaceid, workspaceid), eq(items.inventorycategory, "lab"))
      )
      .groupBy(
        items.id,
        items.name,
        items.genericname,
        items.itemtype,
        items.itemcode,
        items.uom,
        items.barcode,
        items.manufacturer,
        items.isactive,
        items.reorderlevel,
        items.inventorycategory,
        items.criticalreagent,
        items.analyzercompat
      )
      .orderBy(items.name);

    const enrichedItems = await Promise.all(
      allItems.map(async (item) => {
        const batches = await db
          .select({
            batchid: itemBatches.id,
            batchnumber: itemBatches.batchnumber,
            quantity: itemBatches.quantity,
            unitcost: itemBatches.unitcost,
            expirydate: itemBatches.expirydate,
          })
          .from(itemBatches)
          .where(eq(itemBatches.itemid, item.itemid))
          .orderBy(itemBatches.batchnumber);

        const locations = await db
          .select({
            warehouseid: warehouses.id,
            warehousename: warehouses.name,
            sectionid: warehouseSections.id,
            sectionname: warehouseSections.sectionname,
            quantity: inventoryStock.quantity,
            reservedquantity: inventoryStock.reservedquantity,
            batchid: inventoryStock.batchid,
          })
          .from(inventoryStock)
          .innerJoin(warehouses, eq(inventoryStock.warehouseid, warehouses.id))
          .leftJoin(warehouseSections, eq(inventoryStock.warehouseid, warehouseSections.warehouseid))
          .where(
            and(
              eq(inventoryStock.itemid, item.itemid),
              eq(warehouses.warehousetype, "lab"),
              // Scope to this facility's warehouses. Filtering on type alone
              // would surface another lab's stock once a second lab exists.
              eq(warehouses.workspaceid, workspaceid)
            )
          );

        const now = new Date();
        const hasExpired = batches.some((b) => b.expirydate && new Date(b.expirydate) < now);
        const hasExpiring = batches.some((b) => {
          if (!b.expirydate) return false;
          const days = (new Date(b.expirydate).getTime() - now.getTime()) / 86400000;
          return days >= 0 && days <= 30;
        });

        const effectiveReorderLevel = getEffectiveReorderLevel(item);
        const isLowStock = item.totalStock > 0 && item.totalStock <= effectiveReorderLevel;
        const isOutOfStock = item.totalStock === 0;

        let status: "ok" | "low" | "outofstock" = "ok";
        if (isOutOfStock) status = "outofstock";
        else if (isLowStock) status = "low";

        return {
          ...item,
          batches,
          locations,
          hasExpiring,
          hasExpired,
          isLowStock,
          isOutOfStock,
          status,
          reorderSuggested: isLowStock || isOutOfStock,
          suggestedReorderQty: isOutOfStock
            ? DEFAULT_REORDER_QUANTITY
            : isLowStock
            ? Math.max(DEFAULT_REORDER_QUANTITY - item.totalStock, 0)
            : 0,
        };
      })
    );

    let filtered = enrichedItems;
    if (filter === "low") filtered = enrichedItems.filter((i) => i.isLowStock);
    else if (filter === "outofstock") filtered = enrichedItems.filter((i) => i.isOutOfStock);
    else if (filter === "expiring") filtered = enrichedItems.filter((i) => i.hasExpiring || i.hasExpired);

    const summary = {
      totalItems: enrichedItems.length,
      lowStock: enrichedItems.filter((i) => i.isLowStock).length,
      outOfStock: enrichedItems.filter((i) => i.isOutOfStock).length,
      expiringSoon: enrichedItems.filter((i) => i.hasExpiring).length,
      expired: enrichedItems.filter((i) => i.hasExpired).length,
      reorderNeeded: enrichedItems.filter((i) => i.reorderSuggested).length,
      threshold: FALLBACK_REORDER_THRESHOLD,
    };

    const recentMovements = await db
      .select({
        movementid: stockTransactions.id,
        itemid: stockTransactions.itemid,
        transactiontype: stockTransactions.transactiontype,
        quantity: stockTransactions.quantity,
        referencetype: stockTransactions.referencetype,
        createdat: stockTransactions.createdat,
        itemname: items.name,
        warehousename: warehouses.name,
      })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemid, items.id))
      .innerJoin(warehouses, eq(stockTransactions.warehouseid, warehouses.id))
      .where(and(eq(warehouses.warehousetype, "lab"), eq(warehouses.workspaceid, workspaceid)))
      .orderBy(desc(stockTransactions.createdat))
      .limit(20);

    return NextResponse.json({ inventory: filtered, summary, recentMovements });
  } catch (error) {
    console.error("[Lab Inventory]", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
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

    const body = await request.json();
    const { name, itemcode, itemtype, uom, manufacturer, barcode, reorderlevel, minlevel, maxlevel, criticalreagent, analyzercompat } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(items)
      .values({
        workspaceid,
        name,
        itemcode: itemcode ?? null,
        itemtype: itemtype ?? "reagent",
        inventorycategory: "lab",
        drugid: null,
        uom: uom ?? "unit",
        manufacturer: manufacturer ?? null,
        barcode: barcode ?? null,
        reorderlevel: reorderlevel ?? null,
        minlevel: minlevel ?? null,
        maxlevel: maxlevel ?? null,
        criticalreagent: criticalreagent ?? false,
        analyzercompat: analyzercompat ?? null,
        isactive: true,
      })
      .returning();

    return NextResponse.json({ item: created });
  } catch (error) {
    console.error("[Lab Inventory POST]", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
