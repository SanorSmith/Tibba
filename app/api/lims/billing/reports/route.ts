/**
 * GET /api/lims/billing/reports?workspaceid=&from=&to=
 *
 * Lab finance reporting: what was earned, what came in, what is still owed,
 * and who collected it.
 *
 * Revenue and collections are reported separately on purpose. Invoiced is
 * what the lab earned in the period; collected is cash that actually arrived,
 * which may be against an older invoice. Conflating them is how a lab ends up
 * thinking it has money it hasn't been paid.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { labPayments } from "@/lib/db/tables/lab-pos";
import { eq, and, gte, lte, sql, inArray, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    if (!workspaceid) return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {


    const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const from =
      searchParams.get("from") ||
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

    // Invoices raised by this lab.
    const owned = await db
      .selectDistinct({ id: generalInvoiceItems.invoice_id })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid));
    const ids = owned.map((o) => o.id);

    const empty = {
      range: { from, to },
      invoiced: { count: 0, total: 0 },
      collected: { total: 0, byMethod: [] as Array<{ method: string; amount: number; count: number }> },
      outstanding: { count: 0, total: 0 },
      refunds: { count: 0, total: 0 },
      topTests: [] as Array<{ name: string; count: number; revenue: number }>,
      byCashier: [] as Array<{ name: string; amount: number; count: number }>,
      daily: [] as Array<{ day: string; invoiced: number; collected: number }>,
    };
    if (ids.length === 0) return NextResponse.json(empty);

    // ── What the lab earned in the period ────────────────────────────────
    const [invoiced] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${generalInvoices.total_amount}), 0)`,
      })
      .from(generalInvoices)
      .where(
        and(
          inArray(generalInvoices.id, ids),
          gte(generalInvoices.invoice_date, from),
          lte(generalInvoices.invoice_date, to)
        )
      );

    // ── What actually came in ────────────────────────────────────────────
    const byMethod = await db
      .select({
        method: labPayments.method,
        amount: sql<string>`COALESCE(SUM(${labPayments.amount}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(labPayments)
      .where(
        and(
          eq(labPayments.workspaceid, workspaceid),
          gte(sql`${labPayments.createdat}::date`, from),
          lte(sql`${labPayments.createdat}::date`, to)
        )
      )
      .groupBy(labPayments.method);

    // ── Still owed, regardless of when it was invoiced ───────────────────
    const [outstanding] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${generalInvoices.balance_due}), 0)`,
      })
      .from(generalInvoices)
      .where(and(inArray(generalInvoices.id, ids), sql`${generalInvoices.balance_due} > 0`));

    const [refunds] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(ABS(${labPayments.amount})), 0)`,
      })
      .from(labPayments)
      .where(and(eq(labPayments.workspaceid, workspaceid), eq(labPayments.isrefund, true)));

    // ── Which tests bring the money in ───────────────────────────────────
    const topTests = await db
      .select({
        name: generalInvoiceItems.service_name,
        count: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${generalInvoiceItems.total_price}), 0)`,
      })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid))
      .groupBy(generalInvoiceItems.service_name)
      .orderBy(desc(sql`SUM(${generalInvoiceItems.total_price})`))
      .limit(10);

    // ── Who collected it ─────────────────────────────────────────────────
    const byCashier = await db
      .select({
        name: labPayments.receivedbyname,
        amount: sql<string>`COALESCE(SUM(${labPayments.amount}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(labPayments)
      .where(
        and(
          eq(labPayments.workspaceid, workspaceid),
          gte(sql`${labPayments.createdat}::date`, from),
          lte(sql`${labPayments.createdat}::date`, to)
        )
      )
      .groupBy(labPayments.receivedbyname);

    // ── Day by day, for the trend ────────────────────────────────────────
    const dailyInvoiced = await db
      .select({
        day: sql<string>`${generalInvoices.invoice_date}::text`,
        total: sql<string>`COALESCE(SUM(${generalInvoices.total_amount}), 0)`,
      })
      .from(generalInvoices)
      .where(
        and(
          inArray(generalInvoices.id, ids),
          gte(generalInvoices.invoice_date, from),
          lte(generalInvoices.invoice_date, to)
        )
      )
      .groupBy(sql`${generalInvoices.invoice_date}`);

    const dailyCollected = await db
      .select({
        day: sql<string>`${labPayments.createdat}::date::text`,
        total: sql<string>`COALESCE(SUM(${labPayments.amount}), 0)`,
      })
      .from(labPayments)
      .where(
        and(
          eq(labPayments.workspaceid, workspaceid),
          gte(sql`${labPayments.createdat}::date`, from),
          lte(sql`${labPayments.createdat}::date`, to)
        )
      )
      .groupBy(sql`${labPayments.createdat}::date`);

    const days = new Map<string, { day: string; invoiced: number; collected: number }>();
    dailyInvoiced.forEach((d) =>
      days.set(d.day, { day: d.day, invoiced: Number(d.total), collected: 0 })
    );
    dailyCollected.forEach((d) => {
      const row = days.get(d.day) ?? { day: d.day, invoiced: 0, collected: 0 };
      row.collected = Number(d.total);
      days.set(d.day, row);
    });

    return NextResponse.json({
      range: { from, to },
      invoiced: { count: invoiced?.count ?? 0, total: Number(invoiced?.total ?? 0) },
      collected: {
        total: byMethod.reduce((s, m) => s + Number(m.amount), 0),
        byMethod: byMethod.map((m) => ({
          method: m.method,
          amount: Number(m.amount),
          count: m.count,
        })),
      },
      outstanding: { count: outstanding?.count ?? 0, total: Number(outstanding?.total ?? 0) },
      refunds: { count: refunds?.count ?? 0, total: Number(refunds?.total ?? 0) },
      topTests: topTests.map((t) => ({
        name: t.name ?? "Unnamed",
        count: t.count,
        revenue: Number(t.revenue),
      })),
      byCashier: byCashier.map((c) => ({
        name: c.name ?? "Unknown",
        amount: Number(c.amount),
        count: c.count,
      })),
      daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    });
    });
  } catch (error) {
    console.error("[lab reports]", error);
    return NextResponse.json({ error: "Failed to build reports" }, { status: 500 });
  }
}
