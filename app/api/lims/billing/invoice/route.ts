/**
 * POST /api/lims/billing/invoice
 *
 * Creates an invoice from lines selected in the Lab Billing tab. This is
 * order fulfillment/billing, not a retail sale — there is no cart of free
 * items and no stock deduction here. Each line is stamped with
 * lims_order_test_ref/lims_order_source (migration 0056) so it won't be
 * offered again by /api/lims/billing/pending once billed.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

interface SelectedLine {
  source: "LIMS" | "EHR";
  ref: string;
  testCode: string | null;
  testName: string;
  price: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceid, patientid, lines } = body as {
      workspaceid: string;
      patientid: string;
      lines: SelectedLine[];
    };

    if (!workspaceid || !patientid || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "workspaceid, patientid and at least one line are required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {


    const [patient] = await db.select().from(patients).where(eq(patients.patientid, patientid)).limit(1);

    const subtotal = lines.reduce((sum, l) => sum + (l.price || 0), 0);
    const invoiceNumber = `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;

    const [invoice] = await db
      .insert(generalInvoices)
      .values({
        workspaceid,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().slice(0, 10),
        patient_id: patientid,
        patient_name: patient ? [patient.firstname, patient.middlename, patient.lastname].filter(Boolean).join(" ") : null,
        subtotal: subtotal.toFixed(2),
        total_amount: subtotal.toFixed(2),
        balance_due: subtotal.toFixed(2),
        status: "PENDING",
      })
      .returning();

    await db.insert(generalInvoiceItems).values(
      lines.map((l) => ({
        invoice_id: invoice.id,
        service_name: l.testName,
        quantity: "1",
        unit_price: (l.price || 0).toFixed(2),
        total_price: (l.price || 0).toFixed(2),
        lims_order_test_ref: l.ref,
        lims_order_source: l.source,
        workspaceid,
      }))
    );

    return NextResponse.json({ invoice });
    });
  } catch (error) {
    console.error("[lab billing invoice]", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
