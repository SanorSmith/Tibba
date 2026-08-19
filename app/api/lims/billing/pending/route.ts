/**
 * GET /api/lims/billing/pending?workspaceid=&patientid=
 *
 * The Lab Billing tab's data source. Unlike Pharmacy's POS, this does NOT
 * sell from lab inventory — it lists a patient's outstanding lab test
 * orders from two sources: this app's own LIMS orders (lims_orders /
 * lims_order_tests) and doctor referrals pulled from the EHR via the
 * existing /api/lims/orders/openehr route. Already-billed lines are
 * excluded by checking invoice_items.lims_order_test_ref (see migration
 * 0056) so the same test can't be invoiced twice.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limsOrders, limsOrderTests } from "@/lib/db/tables/lims-order";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { generalInvoiceItems } from "@/lib/db/tables/invoices";
import { eq, and, ne, inArray } from "drizzle-orm";
import { getUser } from "@/lib/user";

interface PendingLine {
  source: "LIMS" | "EHR";
  ref: string; // ordertestid (LIMS) or composition_uid (EHR)
  orderId: string;
  testCode: string | null;
  testName: string;
  price: number;
  orderedAt: string | null;
  orderingProvider: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const patientid = searchParams.get("patientid");
    if (!workspaceid || !patientid) {
      return NextResponse.json({ error: "workspaceid and patientid are required" }, { status: 400 });
    }

    // Already-billed refs for this workspace, so we can exclude them below.
    const billed = await db
      .select({ ref: generalInvoiceItems.lims_order_test_ref })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid));
    const billedRefs = new Set(billed.map((b) => b.ref).filter(Boolean) as string[]);

    // ── LIMS-sourced pending tests ──────────────────────────────────────
    const limsRows = await db
      .select({
        ordertestid: limsOrderTests.ordertestid,
        orderid: limsOrderTests.orderid,
        testcode: limsOrderTests.testcode,
        testname: limsOrderTests.testname,
        createdat: limsOrderTests.createdat,
        orderingprovidername: limsOrders.orderingprovidername,
        orderstatus: limsOrders.status,
      })
      .from(limsOrderTests)
      .innerJoin(limsOrders, eq(limsOrderTests.orderid, limsOrders.orderid))
      .where(
        and(
          eq(limsOrders.workspaceid, workspaceid),
          eq(limsOrders.subjectidentifier, patientid),
          ne(limsOrders.status, "CANCELLED")
        )
      );

    const testCodes = [...new Set(limsRows.map((r) => r.testcode).filter(Boolean) as string[])];
    const prices = testCodes.length
      ? await db
          .select({ testcode: testReferenceRanges.testcode, price: testReferenceRanges.price })
          .from(testReferenceRanges)
          .where(and(eq(testReferenceRanges.workspaceid, workspaceid), inArray(testReferenceRanges.testcode, testCodes)))
      : [];
    const priceByCode = new Map(prices.map((p) => [p.testcode, p.price ? Number(p.price) : 0]));

    const limsPending: PendingLine[] = limsRows
      .filter((r) => !billedRefs.has(r.ordertestid))
      .map((r) => ({
        source: "LIMS",
        ref: r.ordertestid,
        orderId: r.orderid,
        testCode: r.testcode,
        testName: r.testname ?? r.testcode ?? "Unknown test",
        price: r.testcode ? priceByCode.get(r.testcode) ?? 0 : 0,
        orderedAt: r.createdat ? String(r.createdat) : null,
        orderingProvider: r.orderingprovidername ?? null,
      }));

    // ── EHR-referred pending tests ──────────────────────────────────────
    let ehrPending: PendingLine[] = [];
    try {
      const origin = request.nextUrl.origin;
      const ehrRes = await fetch(
        `${origin}/api/lims/orders/openehr?workspaceid=${workspaceid}&patientid=${patientid}`,
        { headers: { cookie: request.headers.get("cookie") ?? "" } }
      );
      if (ehrRes.ok) {
        const ehrData = await ehrRes.json();
        const orders: Array<Record<string, unknown>> = ehrData.orders ?? [];
        ehrPending = orders
          .filter((o) => o.status !== "CANCELLED" && !billedRefs.has(String(o.composition_uid)))
          .map((o) => ({
            source: "EHR",
            ref: String(o.composition_uid),
            orderId: String(o.request_id ?? o.composition_uid),
            testCode: (o.service_type_code as string) ?? null,
            testName: (o.service_name as string) ?? "Referred test",
            price: 0, // EHR referrals don't carry a lab price code here; set on invoice creation if needed
            orderedAt: (o.recorded_time as string) ?? null,
            orderingProvider: (o.requesting_provider as string) ?? null,
          }));
      }
    } catch (e) {
      console.error("[lab billing pending] EHR pull failed:", e);
      // Don't fail the whole response if EHR is unreachable — LIMS-sourced
      // lines are still useful on their own.
    }

    return NextResponse.json({ pending: [...limsPending, ...ehrPending] });
  } catch (error) {
    console.error("[lab billing pending]", error);
    return NextResponse.json({ error: "Failed to load pending lab orders" }, { status: 500 });
  }
}
