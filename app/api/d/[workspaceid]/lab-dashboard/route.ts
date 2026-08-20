/**
 * Lab dashboard — the state of the lab in one request.
 *
 * Deliberately answers the questions a lab manager actually opens the system
 * to ask: what work is waiting, what money is owed, what is about to run out,
 * and what is about to expire. Everything is scoped to this facility.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limsOrders, limsOrderTests } from "@/lib/db/tables/lims-order";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { labPayments } from "@/lib/db/tables/lab-pos";
import { labPurchaseOrders, labVendorReturns, labClaims } from "@/lib/db/tables/lab-procurement";
import { items, inventoryStock, itemBatches, warehouses, stockTransactions } from "@/lib/db/schema";
import { eq, and, ne, sql, desc, inArray, gte } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    // ── Work waiting ─────────────────────────────────────────────────────
    const [orders] = await db
      .select({
        openOrders: sql<number>`COUNT(DISTINCT ${limsOrders.orderid})::int`,
        pendingTests: sql<number>`COUNT(${limsOrderTests.ordertestid})::int`,
      })
      .from(limsOrders)
      .leftJoin(limsOrderTests, eq(limsOrderTests.orderid, limsOrders.orderid))
      .where(and(eq(limsOrders.workspaceid, workspaceid), ne(limsOrders.status, "CANCELLED")));

    // ── Money ────────────────────────────────────────────────────────────
    const owned = await db
      .selectDistinct({ id: generalInvoiceItems.invoice_id })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid));
    const invoiceIds = owned.map((o) => o.id);

    let outstanding = { count: 0, total: 0 };
    let billedToday = 0;
    if (invoiceIds.length > 0) {
      const [out] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          total: sql<string>`COALESCE(SUM(${generalInvoices.balance_due}), 0)`,
        })
        .from(generalInvoices)
        .where(and(inArray(generalInvoices.id, invoiceIds), sql`${generalInvoices.balance_due} > 0`));
      outstanding = { count: out?.count ?? 0, total: Number(out?.total ?? 0) };

      const [bt] = await db
        .select({ total: sql<string>`COALESCE(SUM(${generalInvoices.total_amount}), 0)` })
        .from(generalInvoices)
        .where(and(inArray(generalInvoices.id, invoiceIds), eq(generalInvoices.invoice_date, today)));
      billedToday = Number(bt?.total ?? 0);
    }

    const [collectedToday] = await db
      .select({ total: sql<string>`COALESCE(SUM(${labPayments.amount}), 0)` })
      .from(labPayments)
      .where(
        and(eq(labPayments.workspaceid, workspaceid), gte(sql`${labPayments.createdat}::date`, today))
      );

    // ── Stock ────────────────────────────────────────────────────────────
    const stockRows = await db
      .select({
        id: items.id,
        name: items.name,
        reorderlevel: items.reorderlevel,
        qty: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
      })
      .from(items)
      .leftJoin(inventoryStock, eq(inventoryStock.itemid, items.id))
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(items.inventorycategory, "lab"),
          ne(items.isactive, false)
        )
      )
      .groupBy(items.id, items.name, items.reorderlevel);

    const lowStock = stockRows.filter((r) => r.qty > 0 && r.qty <= (r.reorderlevel ?? 10));
    const outOfStock = stockRows.filter((r) => r.qty === 0);

    // Expiring batches that still hold stock — an expired empty batch is noise.
    const expiring = await db
      .select({
        id: itemBatches.id,
        name: items.name,
        batchnumber: itemBatches.batchnumber,
        quantity: itemBatches.quantity,
        expirydate: itemBatches.expirydate,
      })
      .from(itemBatches)
      .innerJoin(items, eq(itemBatches.itemid, items.id))
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(items.inventorycategory, "lab"),
          sql`${itemBatches.quantity} > 0`,
          sql`${itemBatches.expirydate} IS NOT NULL`,
          sql`${itemBatches.expirydate}::date <= ${in30}`
        )
      )
      .orderBy(itemBatches.expirydate)
      .limit(20);

    // ── Procurement in flight ────────────────────────────────────────────
    const [po] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(labPurchaseOrders)
      .where(
        and(
          eq(labPurchaseOrders.workspaceid, workspaceid),
          ne(labPurchaseOrders.status, "DELIVERED"),
          ne(labPurchaseOrders.status, "CANCELLED")
        )
      );

    const [openClaims] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${labClaims.claimamount}), 0)`,
      })
      .from(labClaims)
      .where(and(eq(labClaims.workspaceid, workspaceid), ne(labClaims.status, "SETTLED")));

    const [returnsCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(labVendorReturns)
      .where(eq(labVendorReturns.workspaceid, workspaceid));

    // ── Recent stock activity ────────────────────────────────────────────
    const recent = await db
      .select({
        id: stockTransactions.id,
        type: stockTransactions.transactiontype,
        quantity: stockTransactions.quantity,
        item: items.name,
        reference: stockTransactions.referenceid,
        createdat: stockTransactions.createdat,
      })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemid, items.id))
      .innerJoin(warehouses, eq(stockTransactions.warehouseid, warehouses.id))
      .where(and(eq(items.workspaceid, workspaceid), eq(warehouses.warehousetype, "lab")))
      .orderBy(desc(stockTransactions.createdat))
      .limit(12);

    return NextResponse.json({
      work: { openOrders: orders?.openOrders ?? 0, pendingTests: orders?.pendingTests ?? 0 },
      money: {
        billedToday,
        collectedToday: Number(collectedToday?.total ?? 0),
        outstandingCount: outstanding.count,
        outstandingTotal: outstanding.total,
      },
      stock: {
        totalItems: stockRows.length,
        lowStock: lowStock.map((r) => ({ name: r.name, qty: r.qty, reorderlevel: r.reorderlevel })),
        outOfStock: outOfStock.map((r) => ({ name: r.name })),
        expiring: expiring.map((e) => ({
          name: e.name,
          batchnumber: e.batchnumber,
          quantity: e.quantity,
          expirydate: e.expirydate,
          expired: e.expirydate ? new Date(e.expirydate) < new Date() : false,
        })),
      },
      procurement: {
        openOrders: po?.count ?? 0,
        openClaims: openClaims?.count ?? 0,
        openClaimsValue: Number(openClaims?.total ?? 0),
        returns: returnsCount?.count ?? 0,
      },
      recent,
    });
  } catch (error) {
    console.error("[lab dashboard]", error);
    return NextResponse.json({ error: "Failed to build dashboard" }, { status: 500 });
  }
}
