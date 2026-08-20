/**
 * GET /api/lims/billing/invoices?workspaceid=[&status=]
 *
 * Lab invoices with what has been paid and what is still owed, so the
 * cashier can see who to collect from. Only invoices raised by this lab's
 * Billing tab appear — matched through invoice_items.workspaceid, since the
 * invoices table itself is shared across modules.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { labPayments } from "@/lib/db/tables/lab-pos";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const status = searchParams.get("status");
    if (!workspaceid) return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    // Invoice ids this lab raised.
    const owned = await db
      .selectDistinct({ id: generalInvoiceItems.invoice_id })
      .from(generalInvoiceItems)
      .where(eq(generalInvoiceItems.workspaceid, workspaceid));
    const ids = owned.map((o) => o.id);
    if (ids.length === 0) return NextResponse.json({ invoices: [] });

    const rows = await db
      .select({
        id: generalInvoices.id,
        invoiceNumber: generalInvoices.invoice_number,
        invoiceDate: generalInvoices.invoice_date,
        patientId: generalInvoices.patient_id,
        patientName: generalInvoices.patient_name,
        total: generalInvoices.total_amount,
        paid: generalInvoices.amount_paid,
        balance: generalInvoices.balance_due,
        status: generalInvoices.status,
        paymentMethod: generalInvoices.payment_method,
        createdat: generalInvoices.createdat,
        lineCount: sql<number>`(SELECT COUNT(*) FROM invoice_items WHERE invoice_id = ${generalInvoices.id})::int`,
      })
      .from(generalInvoices)
      .where(inArray(generalInvoices.id, ids))
      .orderBy(desc(generalInvoices.createdat));

    const filtered = status ? rows.filter((r) => r.status === status) : rows;

    // Payment history, so the cashier can see part-payments and refunds
    // rather than just a balance that moved.
    const payments = await db
      .select({
        id: labPayments.id,
        invoiceid: labPayments.invoiceid,
        amount: labPayments.amount,
        method: labPayments.method,
        isrefund: labPayments.isrefund,
        receivedbyname: labPayments.receivedbyname,
        createdat: labPayments.createdat,
      })
      .from(labPayments)
      .where(eq(labPayments.workspaceid, workspaceid))
      .orderBy(desc(labPayments.createdat));

    const byInvoice = new Map<string, typeof payments>();
    payments.forEach((p) => {
      const list = byInvoice.get(p.invoiceid) ?? [];
      list.push(p);
      byInvoice.set(p.invoiceid, list);
    });

    return NextResponse.json({
      invoices: filtered.map((r) => ({
        ...r,
        total: Number(r.total ?? 0),
        paid: Number(r.paid ?? 0),
        balance: Number(r.balance ?? 0),
        payments: byInvoice.get(r.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("[lab invoices]", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
