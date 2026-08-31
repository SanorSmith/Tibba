/**
 * Pharmacy Dashboard Stats API
 * Returns aggregated stats for the pharmacy dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  drugs,
  stockLevels,
  posSales,
  posPayments,
  invoices,
} from "@/lib/db/schema";
import { eq, and, sql, lt, gte, count } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { ordersForFacility } from "@/lib/pharmacy/order-access";

const LOW_STOCK_THRESHOLD = 10;
const OVERDUE_HOURS = 24;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    // Date calculations — all aligned to Baghdad local time (UTC+3)
    const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowUtc = Date.now();
    // Midnight Baghdad = floor to day in Baghdad time, then convert back to UTC
    const todayStart = new Date(
      Math.floor((nowUtc + BAGHDAD_OFFSET_MS) / 86_400_000) * 86_400_000 - BAGHDAD_OFFSET_MS
    );

    const overdueThreshold = new Date(nowUtc - OVERDUE_HOURS * 60 * 60 * 1000);

    // Day ranges for sales comparison: today, same day 1 year ago, same day 2 years ago
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const lastYearStart = new Date(todayStart);
    lastYearStart.setUTCFullYear(lastYearStart.getUTCFullYear() - 1);
    const lastYearEnd = new Date(lastYearStart.getTime() + 86_400_000);
    const twoYearsAgoStart = new Date(todayStart);
    twoYearsAgoStart.setUTCFullYear(twoYearsAgoStart.getUTCFullYear() - 2);
    const twoYearsAgoEnd = new Date(twoYearsAgoStart.getTime() + 86_400_000);

    const dayLabel = (d: Date) =>
      new Date(d.getTime() + BAGHDAD_OFFSET_MS).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });

    const monthStart = new Date(
      Math.floor((nowUtc + BAGHDAD_OFFSET_MS) / 86_400_000) * 86_400_000 - BAGHDAD_OFFSET_MS
    );
    // Rewind to the 1st of the current Baghdad month
    const baghdadNow = new Date(nowUtc + BAGHDAD_OFFSET_MS);
    monthStart.setTime(
      new Date(Date.UTC(baghdadNow.getUTCFullYear(), baghdadNow.getUTCMonth(), 1)).getTime() - BAGHDAD_OFFSET_MS
    );

    // Run all queries in parallel for better performance
    const [
      lowStockItems,
      orderStats,
      todayStats,
      posSalesStats,
      todayPosSales,
      monthlyPosSales,
      overdueOrders,
      doctorNotifications,
      todayPaymentBreakdown,
      topSellers,
      invoiceSalesComparison,
      posSalesComparison,
    ] = await Promise.all([
      // 1. Low stock medicines
      db
        .select({
          drugid: stockLevels.drugid,
          drugname: drugs.name,
          strength: drugs.strength,
          form: drugs.form,
          totalQuantity: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)::int`,
        })
        .from(stockLevels)
        .innerJoin(drugs, eq(stockLevels.drugid, drugs.drugid))
        .groupBy(stockLevels.drugid, drugs.name, drugs.strength, drugs.form)
        .having(sql`SUM(${stockLevels.quantity}) < ${LOW_STOCK_THRESHOLD}`),

      // 2. Total orders by status
      db
        .select({
          status: pharmacyOrders.status,
          count: count(),
        })
        .from(pharmacyOrders)
        .where(ordersForFacility(workspaceid))
        .groupBy(pharmacyOrders.status),

      // 3. Today's orders & unique patients
      db
        .select({
          orderCount: count(),
          uniquePatients: sql<number>`COUNT(DISTINCT ${pharmacyOrders.patientid})::int`,
        })
        .from(pharmacyOrders)
        .where(
          and(
            ordersForFacility(workspaceid),
            gte(pharmacyOrders.createdat, todayStart)
          )
        ),

      // 4. Sales stats (from POS sales)
      db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
          totalInvoices: count(),
        })
        .from(posSales)
        .where(eq(posSales.workspaceid, workspaceid)),

      // 5. Today's sales (POS)
      db
        .select({
          total: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        })
        .from(posSales)
        .where(
          and(
            eq(posSales.workspaceid, workspaceid),
            gte(posSales.createdat, todayStart)
          )
        ),

      // 6. Monthly sales (POS)
      db
        .select({
          total: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        })
        .from(posSales)
        .where(
          and(
            eq(posSales.workspaceid, workspaceid),
            gte(posSales.createdat, monthStart)
          )
        ),

      // 5. Overdue orders
      db
        .select({
          orderid: pharmacyOrders.orderid,
          patientid: pharmacyOrders.patientid,
          priority: pharmacyOrders.priority,
          createdat: pharmacyOrders.createdat,
          notes: pharmacyOrders.notes,
        })
        .from(pharmacyOrders)
        .where(
          and(
            ordersForFacility(workspaceid),
            eq(pharmacyOrders.status, "PENDING"),
            lt(pharmacyOrders.createdat, overdueThreshold)
          )
        )
        .limit(10),

      // 6. Doctor notifications
      db
        .select({
          orderid: pharmacyOrders.orderid,
          priority: pharmacyOrders.priority,
          status: pharmacyOrders.status,
          notes: pharmacyOrders.notes,
          createdat: pharmacyOrders.createdat,
          source: pharmacyOrders.source,
        })
        .from(pharmacyOrders)
        .where(
          and(
            ordersForFacility(workspaceid),
            sql`${pharmacyOrders.status} IN ('PENDING', 'IN_PROGRESS')`,
            sql`${pharmacyOrders.priority} IN ('urgent', 'stat')`
          )
        )
        .limit(10),

      // 8. Today's payment breakdown by method
      db
        .select({
          paymentmethod: posPayments.paymentmethod,
          total: sql<string>`COALESCE(SUM(${posPayments.amount}::numeric), 0)`,
          txcount: sql<number>`COUNT(*)::int`,
        })
        .from(posPayments)
        .innerJoin(posSales, eq(posPayments.saleid, posSales.saleid))
        .where(
          and(
            eq(posSales.workspaceid, workspaceid),
            gte(posSales.saledate, todayStart)
          )
        )
        .groupBy(posPayments.paymentmethod),

      // 7. Top selling medicines
      db
        .select({
          drugid: drugs.drugid,
          drugname: drugs.name,
          genericname: drugs.genericname,
          strength: drugs.strength,
          form: drugs.form,
          totalquantity: sql<number>`COALESCE(SUM(${pharmacyOrderItems.quantity}), 0)::int`,
        })
        .from(pharmacyOrderItems)
        .innerJoin(pharmacyOrders, eq(pharmacyOrderItems.orderid, pharmacyOrders.orderid))
        .innerJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
        .where(
          and(
            ordersForFacility(workspaceid),
            sql`${pharmacyOrders.status} IN ('DISPENSED', 'COMPLETED')`,
            gte(pharmacyOrders.createdat, monthStart)
          )
        )
        .groupBy(drugs.drugid, drugs.name, drugs.genericname, drugs.strength, drugs.form)
        .orderBy(sql`SUM(${pharmacyOrderItems.quantity}) DESC`)
        .limit(10),

      // 9. Sales comparison (invoices): today vs same day 1yr ago vs same day 2yrs ago
      db
        .select({
          current: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.createdat} >= ${todayStart.toISOString()}::timestamptz AND ${invoices.createdat} < ${todayEnd.toISOString()}::timestamptz THEN ${invoices.total}::numeric ELSE 0 END), 0)`,
          lastYear: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.createdat} >= ${lastYearStart.toISOString()}::timestamptz AND ${invoices.createdat} < ${lastYearEnd.toISOString()}::timestamptz THEN ${invoices.total}::numeric ELSE 0 END), 0)`,
          twoYearsAgo: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.createdat} >= ${twoYearsAgoStart.toISOString()}::timestamptz AND ${invoices.createdat} < ${twoYearsAgoEnd.toISOString()}::timestamptz THEN ${invoices.total}::numeric ELSE 0 END), 0)`,
        })
        .from(invoices)
        .innerJoin(pharmacyOrders, eq(invoices.orderid, pharmacyOrders.orderid))
        .where(ordersForFacility(workspaceid)),

      // 10. Sales comparison (POS): today vs same day 1yr ago vs same day 2yrs ago
      db
        .select({
          current: sql<string>`COALESCE(SUM(CASE WHEN ${posSales.createdat} >= ${todayStart.toISOString()}::timestamptz AND ${posSales.createdat} < ${todayEnd.toISOString()}::timestamptz THEN ${posSales.totalamount}::numeric ELSE 0 END), 0)`,
          lastYear: sql<string>`COALESCE(SUM(CASE WHEN ${posSales.createdat} >= ${lastYearStart.toISOString()}::timestamptz AND ${posSales.createdat} < ${lastYearEnd.toISOString()}::timestamptz THEN ${posSales.totalamount}::numeric ELSE 0 END), 0)`,
          twoYearsAgo: sql<string>`COALESCE(SUM(CASE WHEN ${posSales.createdat} >= ${twoYearsAgoStart.toISOString()}::timestamptz AND ${posSales.createdat} < ${twoYearsAgoEnd.toISOString()}::timestamptz THEN ${posSales.totalamount}::numeric ELSE 0 END), 0)`,
        })
        .from(posSales)
        .where(eq(posSales.workspaceid, workspaceid)),
    ]);

    // Process order stats
    const totalOrders = orderStats.reduce((sum, s) => sum + Number(s.count), 0);
    const pendingOrders = Number(orderStats.find((s) => s.status === "PENDING")?.count || 0);
    const inProgressOrders = Number(orderStats.find((s) => s.status === "IN_PROGRESS")?.count || 0);
    const dispensedOrders = orderStats
      .filter((s) => s.status === "DISPENSED" || s.status === "PARTIALLY_DISPENSED")
      .reduce((sum, s) => sum + Number(s.count), 0);

    return NextResponse.json({
      lowStock: {
        count: lowStockItems.length,
        threshold: LOW_STOCK_THRESHOLD,
        items: lowStockItems,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        dispensed: dispensedOrders,
        todayCount: Number(todayStats?.[0]?.orderCount || 0),
      },
      customers: {
        todayVisits: Number(todayStats?.[0]?.uniquePatients || 0),
      },
      sales: {
        totalRevenue: parseFloat(posSalesStats?.[0]?.totalSales || "0"),
        todayRevenue: parseFloat(todayPosSales?.[0]?.total || "0"),
        monthlyRevenue: parseFloat(monthlyPosSales?.[0]?.total || "0"),
        totalInvoices: Number(posSalesStats?.[0]?.totalInvoices || 0),
        paidInvoices: 0, // No invoices table available
      },
      overdue: {
        count: overdueOrders.length,
        orders: overdueOrders,
      },
      notifications: {
        count: doctorNotifications.length,
        items: doctorNotifications,
      },
      topSellers: topSellers,
      salesComparison: {
        current: parseFloat(invoiceSalesComparison?.[0]?.current || "0") + parseFloat(posSalesComparison?.[0]?.current || "0"),
        lastYear: parseFloat(invoiceSalesComparison?.[0]?.lastYear || "0") + parseFloat(posSalesComparison?.[0]?.lastYear || "0"),
        twoYearsAgo: parseFloat(invoiceSalesComparison?.[0]?.twoYearsAgo || "0") + parseFloat(posSalesComparison?.[0]?.twoYearsAgo || "0"),
        labels: {
          current: dayLabel(todayStart),
          lastYear: dayLabel(lastYearStart),
          twoYearsAgo: dayLabel(twoYearsAgoStart),
        },
      },
      budget: {
        todayRevenue: parseFloat(todayPosSales?.[0]?.total || "0") + parseFloat(todayPosSales?.[0]?.total || "0"),
        paymentBreakdown: {
          cash: parseFloat(todayPaymentBreakdown.find(p => p.paymentmethod === "CASH")?.total || "0"),
          card: parseFloat(todayPaymentBreakdown.find(p => p.paymentmethod === "CARD")?.total || "0"),
          insurance: parseFloat(todayPaymentBreakdown.find(p => p.paymentmethod === "INSURANCE")?.total || "0"),
          credit: parseFloat(todayPaymentBreakdown.find(p => p.paymentmethod === "CREDIT_ACCOUNT")?.total || "0"),
        },
        transactionCount: todayPaymentBreakdown.reduce((sum, p) => sum + p.txcount, 0),
      },
    });
    });
  } catch (error) {
    console.error("Error fetching pharmacy dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
