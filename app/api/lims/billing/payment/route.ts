/**
 * POST /api/lims/billing/payment — take money against a lab invoice.
 *
 * Payment and the invoice's running balance move together in one transaction,
 * so an invoice can never show as paid without a matching payment row, or
 * collect money that isn't reflected in what the patient still owes.
 *
 * Refunds are the same operation with a negative amount, recorded against the
 * same invoice rather than deleting the original — the money trail stays
 * intact and the totals stay honest.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labPayments, labShifts } from "@/lib/db/tables/lab-pos";
import { generalInvoices } from "@/lib/db/tables/invoices";
import { eq, and } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      workspaceid,
      invoiceId,
      amount,
      method,
      cardLast4,
      reference,
      insuranceCompany,
      insuranceCovered,
      isRefund,
      refundReason,
      notes,
    } = body as {
      workspaceid: string;
      invoiceId: string;
      amount: number;
      method: "CASH" | "CARD" | "INSURANCE" | "TRANSFER";
      cardLast4?: string;
      reference?: string;
      insuranceCompany?: string;
      insuranceCovered?: number;
      isRefund?: boolean;
      refundReason?: string;
      notes?: string;
    };

    if (!workspaceid || !invoiceId || !method) {
      return NextResponse.json({ error: "workspaceid, invoiceId and method are required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    if (!(Number(amount) > 0)) {
      return NextResponse.json({ error: "Amount must be above zero" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(generalInvoices)
        .where(eq(generalInvoices.id, invoiceId))
        .limit(1);
      if (!invoice) throw new Error("Invoice not found");

      const total = Number(invoice.total_amount ?? 0);
      const paid = Number(invoice.amount_paid ?? 0);
      const signed = isRefund ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

      // Refuse to take more than is owed, or refund more than was taken —
      // either would leave a balance that can't be explained.
      if (!isRefund && signed > total - paid + 0.001) {
        throw new Error(`Payment exceeds the ${(total - paid).toLocaleString()} still owed`);
      }
      if (isRefund && Math.abs(signed) > paid + 0.001) {
        throw new Error(`Refund exceeds the ${paid.toLocaleString()} already paid`);
      }

      // Attribute to the open shift so the drawer reconciles at close.
      const [openShift] = await tx
        .select({ id: labShifts.id })
        .from(labShifts)
        .where(and(eq(labShifts.workspaceid, workspaceid), eq(labShifts.status, "OPEN")))
        .limit(1);

      const [payment] = await tx
        .insert(labPayments)
        .values({
          workspaceid,
          invoiceid: invoiceId,
          shiftid: openShift?.id ?? null,
          amount: String(signed.toFixed(2)),
          method,
          cardlast4: cardLast4 || null,
          reference: reference || null,
          insurancecompany: insuranceCompany || null,
          insurancecovered: insuranceCovered != null ? String(insuranceCovered) : null,
          isrefund: !!isRefund,
          refundreason: refundReason || null,
          receivedby: user.userid,
          receivedbyname: user.name ?? user.email ?? null,
          notes: notes || null,
        })
        .returning();

      const newPaid = paid + signed;
      const newBalance = total - newPaid;
      const status = newBalance <= 0.001 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

      await tx
        .update(generalInvoices)
        .set({
          amount_paid: String(newPaid.toFixed(2)),
          balance_due: String(newBalance.toFixed(2)),
          status,
          payment_method: method,
          payment_date: new Date().toISOString().slice(0, 10),
          updatedat: new Date(),
        })
        .where(eq(generalInvoices.id, invoiceId));

      return { payment, newPaid, newBalance, status };
    });

    return NextResponse.json(result);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed";
    console.error("[lab payment]", error);
    const isUserError = /exceeds|not found/i.test(message);
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 });
  }
}
