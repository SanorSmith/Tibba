/**
 * POST /api/lims/billing/invoice/cancel — void an invoice that should not
 * have been raised.
 *
 * Distinct from a refund. A refund returns money while the debt stands, which
 * is why a refunded invoice goes back to owing. Cancelling says the work was
 * never billable: the balance goes to zero and the tests return to the
 * pending list so they can be billed correctly, or left alone.
 *
 * An invoice still holding money cannot be cancelled — refund it first, so
 * the cash movement is recorded rather than silently erased.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { eq, and, sql } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceid, invoiceId, reason, releaseTests = true } = await request.json();
    if (!workspaceid || !invoiceId) {
      return NextResponse.json({ error: "workspaceid and invoiceId are required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!reason?.trim()) {
      // A void with no stated reason is indistinguishable from a mistake.
      return NextResponse.json({ error: "A reason is required to cancel an invoice" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(generalInvoices)
        .where(eq(generalInvoices.id, invoiceId))
        .limit(1);
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "CANCELLED") throw new Error("This invoice is already cancelled");

      const paid = Number(invoice.amount_paid ?? 0);
      if (paid > 0.001) {
        throw new Error(
          `This invoice still holds ${paid.toLocaleString()} in payments. Refund it first, then cancel.`
        );
      }

      await tx
        .update(generalInvoices)
        .set({
          status: "CANCELLED",
          balance_due: "0",
          notes: [invoice.notes, `Cancelled by ${user.name ?? user.email}: ${reason}`]
            .filter(Boolean)
            .join(" | "),
          updatedat: new Date(),
        })
        .where(eq(generalInvoices.id, invoiceId));

      // Clearing the source reference is what puts the tests back on the
      // pending list — that check is what stops a test being billed twice.
      let released = 0;
      if (releaseTests) {
        const rows = await tx
          .update(generalInvoiceItems)
          .set({ lims_order_test_ref: null })
          .where(
            and(
              eq(generalInvoiceItems.invoice_id, invoiceId),
              eq(generalInvoiceItems.workspaceid, workspaceid),
              sql`${generalInvoiceItems.lims_order_test_ref} IS NOT NULL`
            )
          )
          .returning({ id: generalInvoiceItems.id });
        released = rows.length;
      }

      return { invoiceNumber: invoice.invoice_number, released };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel the invoice";
    console.error("[lab invoice cancel]", error);
    const isUserError = /not found|already|still holds|reason/i.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
