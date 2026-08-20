/**
 * GET /api/lims/billing/pending?workspaceid=[&patientid=]
 *
 * Every lab test this facility has been asked to run and hasn't billed yet.
 * Mirrors what the Orders tab lists, minus anything already invoiced, so
 * billing staff work from the same picture as the bench.
 *
 * patientid is optional: without it you get the whole outstanding list,
 * which is how billing is normally worked. Already-billed lines are
 * excluded via invoice_items.lims_order_test_ref (migration 0056).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limsOrders, limsOrderTests } from "@/lib/db/tables/lims-order";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { generalInvoiceItems } from "@/lib/db/tables/invoices";
import { patients } from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

interface PendingLine {
  source: "LIMS" | "EHR";
  ref: string;
  orderId: string;
  patientId: string | null;
  patientName: string;
  testCode: string | null;
  testName: string;
  price: number;
  orderedAt: string | null;
  orderingProvider: string | null;
  status: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const patientid = searchParams.get("patientid");
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    // Refs already invoiced by this facility.
    const billed = await db
      .select({ ref: generalInvoiceItems.lims_order_test_ref })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid));
    const billedRefs = new Set(billed.map((b) => b.ref).filter(Boolean) as string[]);

    // ── Orders raised in this lab ────────────────────────────────────────
    const where = [eq(limsOrders.workspaceid, workspaceid), ne(limsOrders.status, "CANCELLED")];
    if (patientid) where.push(eq(limsOrders.subjectidentifier, patientid));

    const rows = await db
      .select({
        ordertestid: limsOrderTests.ordertestid,
        orderid: limsOrderTests.orderid,
        testcode: limsOrderTests.testcode,
        testname: limsOrderTests.testname,
        teststatus: limsOrderTests.teststatus,
        createdat: limsOrderTests.createdat,
        subjectidentifier: limsOrders.subjectidentifier,
        orderingprovidername: limsOrders.orderingprovidername,
      })
      .from(limsOrderTests)
      .innerJoin(limsOrders, eq(limsOrderTests.orderid, limsOrders.orderid))
      .where(and(...where));

    const unbilled = rows.filter((r) => !billedRefs.has(r.ordertestid));

    // Prices, in one lookup rather than per row.
    const codes = [...new Set(unbilled.map((r) => r.testcode).filter(Boolean) as string[])];
    const priceRows = codes.length
      ? await db
          .select({ testcode: testReferenceRanges.testcode, price: testReferenceRanges.price })
          .from(testReferenceRanges)
          .where(
            and(eq(testReferenceRanges.workspaceid, workspaceid), inArray(testReferenceRanges.testcode, codes))
          )
      : [];
    const priceByCode = new Map(priceRows.map((p) => [p.testcode, p.price ? Number(p.price) : 0]));

    // Patient names, likewise batched. subjectidentifier holds a patient id.
    const patientIds = [...new Set(unbilled.map((r) => r.subjectidentifier).filter(Boolean) as string[])];
    const patientRows = patientIds.length
      ? await db
          .select({
            patientid: patients.patientid,
            firstname: patients.firstname,
            middlename: patients.middlename,
            lastname: patients.lastname,
          })
          .from(patients)
          .where(inArray(patients.patientid, patientIds))
      : [];
    const nameById = new Map(
      patientRows.map((p) => [
        p.patientid,
        [p.firstname, p.middlename, p.lastname].filter(Boolean).join(" ").trim(),
      ])
    );

    const pending: PendingLine[] = unbilled.map((r) => ({
      source: "LIMS",
      ref: r.ordertestid,
      orderId: r.orderid,
      patientId: r.subjectidentifier ?? null,
      // Fall back to the raw identifier so a row is never nameless.
      patientName: nameById.get(r.subjectidentifier ?? "") || r.subjectidentifier || "Unknown patient",
      testCode: r.testcode,
      testName: r.testname ?? r.testcode ?? "Unknown test",
      price: r.testcode ? priceByCode.get(r.testcode) ?? 0 : 0,
      orderedAt: r.createdat ? String(r.createdat) : null,
      orderingProvider: r.orderingprovidername ?? null,
      status: r.teststatus ?? null,
    }));

    // ── Doctor referrals from the EHR ────────────────────────────────────
    //
    // Read the same combined list the Orders tab shows, rather than the
    // workspace-scoped patient pull. A lab is asked to run tests for patients
    // registered at the hospital that referred them, so scoping referrals to
    // the lab's own patients meant the bench saw work it could never bill.
    let ehrPending: PendingLine[] = [];
    try {
      const origin = request.nextUrl.origin;
      const url = `${origin}/api/lims/orders?workspaceid=${workspaceid}&limit=500`;
      const res = await fetch(url, { headers: { cookie: request.headers.get("cookie") ?? "" } });
      if (res.ok) {
        const data = await res.json();
        const orders: Array<Record<string, unknown>> = data.orders ?? [];
        ehrPending = orders
          .filter((o) => o.source === "openEHR")
          .filter((o) => o.status !== "CANCELLED" && o.status !== "COMPLETED")
          .filter((o) => !billedRefs.has(String(o.composition_uid)))
          .filter((o) => (patientid ? String(o.patientId) === patientid : true))
          .map((o) => {
            const code = (o.service_type_code as string) ?? null;
            return {
              source: "EHR" as const,
              ref: String(o.composition_uid),
              orderId: String(o.request_id ?? o.composition_uid),
              patientId: (o.patientId as string) ?? null,
              patientName: (o.patientName as string) ?? "Unknown patient",
              testCode: code,
              testName: (o.service_name as string) ?? "Referred test",
              // Referred tests are priced from this lab's own reference list
              // when the code matches; otherwise they need a price setting.
              price: code ? priceByCode.get(code) ?? 0 : 0,
              orderedAt: (o.recorded_time as string) ?? null,
              orderingProvider: (o.requesting_provider as string) ?? null,
              status: (o.status as string) ?? null,
            };
          });
      }
    } catch (e) {
      // A slow or unreachable EHR shouldn't hide this lab's own orders.
      console.error("[lab billing pending] EHR pull failed:", e);
    }

    const all = [...pending, ...ehrPending].sort((a, b) =>
      (b.orderedAt ?? "").localeCompare(a.orderedAt ?? "")
    );

    return NextResponse.json({ pending: all });
  } catch (error) {
    console.error("[lab billing pending]", error);
    return NextResponse.json({ error: "Failed to load pending lab orders" }, { status: 500 });
  }
}
