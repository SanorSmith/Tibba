/**
 * GET /api/lims/billing/receipts/detail?type=PAYMENT|REFUND|SHIFT&id=...
 *
 * Everything needed to render one receipt exactly as it was printed at the
 * counter: the invoice's test lines for a payment, the drawer figures for a
 * shift. Search returns a summary row; this fills it out.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { labPayments, labShifts } from "@/lib/db/tables/lab-pos";
import { workspaces } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const workspaceid = searchParams.get("workspaceid");
    if (!type || !id || !workspaceid) {
      return NextResponse.json({ error: "type, id and workspaceid are required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {


    const [ws] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceid))
      .limit(1);
    const facility = ws?.name || "Laboratory";

    if (type === "SHIFT") {
      const [shift] = await db
        .select()
        .from(labShifts)
        .where(and(eq(labShifts.id, id), eq(labShifts.workspaceid, workspaceid)))
        .limit(1);
      if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

      const taken = await db
        .select({ amount: labPayments.amount, method: labPayments.method, isrefund: labPayments.isrefund })
        .from(labPayments)
        .where(eq(labPayments.shiftid, shift.id));

      const byMethod = new Map<string, number>();
      for (const p of taken) {
        const signed = (p.isrefund ? -1 : 1) * Number(p.amount ?? 0);
        byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + signed);
      }

      return NextResponse.json({
        kind: "SHIFT",
        facility,
        number: shift.shiftnumber,
        dateTime: (shift.openingtime ?? new Date()).toString(),
        cashier: shift.cashiername,
        lines: [...byMethod.entries()].map(([label, amount]) => ({ label, amount })),
        openingCash: Number(shift.openingcash ?? 0),
        expectedCash: shift.expectedcash == null ? undefined : Number(shift.expectedcash),
        countedCash: shift.actualcash == null ? undefined : Number(shift.actualcash),
        variance: shift.variance == null ? undefined : Number(shift.variance),
      });
    }

    const [payment] = await db
      .select()
      .from(labPayments)
      .where(and(eq(labPayments.id, id), eq(labPayments.workspaceid, workspaceid)))
      .limit(1);
    if (!payment) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const [invoice] = await db
      .select()
      .from(generalInvoices)
      .where(eq(generalInvoices.id, payment.invoiceid))
      .limit(1);

    const items = await db
      .select({
        label: generalInvoiceItems.service_name,
        qty: generalInvoiceItems.quantity,
        amount: generalInvoiceItems.total_price,
      })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.invoice_id, payment.invoiceid))
      .orderBy(desc(generalInvoiceItems.id));

    return NextResponse.json({
      kind: payment.isrefund ? "REFUND" : "PAYMENT",
      facility,
      number: invoice?.invoice_number ?? "—",
      dateTime: (payment.createdat ?? new Date()).toString(),
      patientName: invoice?.patient_name ?? null,
      invoiceNumber: invoice?.invoice_number ?? null,
      method: payment.method,
      cashier: payment.receivedbyname,
      lines: items.map((i) => ({
        label: i.label ?? "Test",
        qty: Number(i.qty ?? 1),
        amount: Number(i.amount ?? 0),
      })),
      total: Number(invoice?.total_amount ?? 0),
      paid: Number(payment.amount ?? 0),
      balance: Number(invoice?.balance_due ?? 0),
    });
    });
  } catch (error) {
    console.error("[lab receipt detail]", error);
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
  }
}
