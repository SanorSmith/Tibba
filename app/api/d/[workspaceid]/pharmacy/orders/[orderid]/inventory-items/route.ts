import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, itemBatches, inventoryStock, drugs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; orderid: string }> }
) {
  try {
    const { workspaceid, orderid } = await params;

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
    const { searchParams } = new URL(request.url);
    const drugid = searchParams.get("drugid");

    if (!drugid) {
      return NextResponse.json(
        { error: "drugid parameter is required" },
        { status: 400 }
      );
    }

    // Transform drug to inventory item using items.drugid → drugs.drugid relationship
    const inventoryItems = await db
      .select({
        itemId: items.id,
        itemName: items.name,
        genericName: items.genericname,
        itemCode: items.itemcode,
        uom: items.uom,
        manufacturer: items.manufacturer,
        drugId: drugs.drugid,
        drugName: drugs.name,
        form: drugs.form,
        strength: drugs.strength,
        batchId: itemBatches.id,
        batchNumber: itemBatches.batchnumber,
        expiryDate: itemBatches.expirydate,
        sellingPrice: itemBatches.sellingprice,
        unitCost: itemBatches.unitcost,
        stockQuantity: inventoryStock.quantity,
      })
      .from(items)
      .innerJoin(drugs, eq(drugs.drugid, items.drugid))
      .leftJoin(itemBatches, eq(itemBatches.itemid, items.id))
      .leftJoin(inventoryStock, and(
        eq(inventoryStock.itemid, items.id),
        eq(inventoryStock.batchid, itemBatches.id)
      ))
      .where(
        and(
          eq(items.drugid, drugid),
          eq(items.workspaceid, workspaceid),
          eq(items.itemtype, 'drug')
        )
      );

    // Everything actually sitting on the shelf. Expiry decides whether that
    // stock may be dispensed - it must not decide whether the row is reported
    // at all. Dropping expired batches here left the caller unable to tell
    // "we hold none of this" from "all we hold has expired", and both arrived
    // at the POS as a bare "Out of stock" while the inventory screen showed
    // the same batch as 400 units in green. The pharmacist was right to find
    // that contradictory: the stock is there, it just cannot be sold.
    const stockedRows = inventoryItems.filter(
      item => (item.stockQuantity ?? 0) > 0
    );

    const now = new Date();

    // Group by item, keeping dispensable and expired stock apart.
    const itemMap = new Map();
    stockedRows.forEach(item => {
      const key = item.itemId;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          itemId: item.itemId,
          itemName: item.itemName,
          genericName: item.genericName,
          itemCode: item.itemCode,
          uom: item.uom,
          manufacturer: item.manufacturer,
          drugId: item.drugId,
          drugName: item.drugName,
          form: item.form,
          strength: item.strength,
          totalStock: 0,
          expiredStock: 0,
          batches: [],
          expiredBatches: [],
        });
      }
      const itemData = itemMap.get(key);
      const expired = !!item.expiryDate && new Date(item.expiryDate) <= now;
      const batch = {
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        sellingPrice: item.sellingPrice,
        unitCost: item.unitCost,
        quantity: item.stockQuantity,
        expired,
      };
      if (expired) {
        itemData.expiredStock += (item.stockQuantity || 0);
        itemData.expiredBatches.push(batch);
      } else {
        // `batches` stays dispensable-only, exactly as before, so a caller
        // that reaches for batches[0] can never land on expired stock.
        itemData.totalStock += (item.stockQuantity || 0);
        itemData.batches.push(batch);
      }
    });

    // Sort by FIFO (earliest expiry first)
    const byExpiry = (a: any, b: any) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return dateA - dateB;
    };
    itemMap.forEach(item => {
      item.batches.sort(byExpiry);
      item.expiredBatches.sort(byExpiry);
    });

    return NextResponse.json({
      items: Array.from(itemMap.values()),
    });
    });
  } catch (error) {
    console.error("[Inventory Items] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
