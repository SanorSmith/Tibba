/**
 * POST /api/lims/billing/receipts/search
 *
 * Finds lab counter receipts to reprint. Mirrors the pharmacy POS receipt
 * search: the counter staff know a receipt number, a patient name, or just
 * the day it happened, so all three are search paths rather than one.
 *
 * Three kinds of paper come off this counter and each is searchable:
 *   PAYMENT — money taken against an invoice
 *   REFUND  — money given back
 *   SHIFT   — the drawer summary printed at close
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalInvoices, generalInvoiceItems } from "@/lib/db/tables/invoices";
import { labPayments, labShifts } from "@/lib/db/tables/lab-pos";
import { and, eq, gte, lte, ilike, desc, inArray, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";
import { isWorkspaceMember } from "@/lib/lims/require-membership";

const searchSchema = z.object({
  workspaceId: z.string().uuid(),
  receiptNumber: z.string().optional(),
  patientName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  receiptType: z.enum(["PAYMENT", "REFUND", "SHIFT", "ALL"]).default("ALL"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = searchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, d.workspaceId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results: { payments: any[]; refunds: any[]; shifts: any[] } = {
      payments: [], refunds: [], shifts: [],
    };

    const wantsPayment = d.receiptType === "ALL" || d.receiptType === "PAYMENT";
    const wantsRefund = d.receiptType === "ALL" || d.receiptType === "REFUND";
    const wantsShift = d.receiptType === "ALL" || d.receiptType === "SHIFT";

    if (wantsPayment || wantsRefund) {
      // Only invoices this lab raised — the invoices table is shared across
      // modules, and workspaceid lives on the line items.
      const owned = await db
        .selectDistinct({ id: generalInvoiceItems.invoice_id })
        .from(generalInvoiceItems)
        .where(eq(generalInvoiceItems.workspaceid, d.workspaceId));
      const invoiceIds = owned.map((o) => o.id);

      if (invoiceIds.length > 0) {
        const where = [eq(labPayments.workspaceid, d.workspaceId), inArray(labPayments.invoiceid, invoiceIds)];
        if (d.startDate) where.push(gte(sql`DATE(${labPayments.createdat})`, d.startDate));
        if (d.endDate) where.push(lte(sql`DATE(${labPayments.createdat})`, d.endDate));
        if (d.receiptNumber) where.push(ilike(generalInvoices.invoice_number, `%${d.receiptNumber}%`));
        if (d.patientName) where.push(ilike(generalInvoices.patient_name, `%${d.patientName}%`));

        const rows = await db
          .select({
            id: labPayments.id,
            invoiceId: labPayments.invoiceid,
            receiptNumber: generalInvoices.invoice_number,
            patientName: generalInvoices.patient_name,
            amount: labPayments.amount,
            method: labPayments.method,
            isrefund: labPayments.isrefund,
            cashier: labPayments.receivedbyname,
            date: labPayments.createdat,
          })
          .from(labPayments)
          .innerJoin(generalInvoices, eq(generalInvoices.id, labPayments.invoiceid))
          .where(and(...where))
          .orderBy(desc(labPayments.createdat))
          .limit(200);

        for (const r of rows) {
          const item = { ...r, amount: Number(r.amount ?? 0), type: r.isrefund ? "REFUND" : "PAYMENT" };
          if (r.isrefund && wantsRefund) results.refunds.push(item);
          if (!r.isrefund && wantsPayment) results.payments.push(item);
        }
      }
    }

    if (wantsShift) {
      const where = [eq(labShifts.workspaceid, d.workspaceId)];
      if (d.startDate) where.push(gte(sql`DATE(${labShifts.openingtime})`, d.startDate));
      if (d.endDate) where.push(lte(sql`DATE(${labShifts.openingtime})`, d.endDate));
      if (d.receiptNumber) where.push(ilike(labShifts.shiftnumber, `%${d.receiptNumber}%`));

      // A shift has no patient, so a patient-name search should simply not
      // match one rather than return every shift of the day.
      if (!d.patientName) {
        const rows = await db
          .select({
            id: labShifts.id,
            receiptNumber: labShifts.shiftnumber,
            cashier: labShifts.cashiername,
            amount: labShifts.expectedcash,
            date: labShifts.openingtime,
            status: labShifts.status,
          })
          .from(labShifts)
          .where(and(...where))
          .orderBy(desc(labShifts.openingtime))
          .limit(100);
        results.shifts = rows.map((r) => ({ ...r, amount: Number(r.amount ?? 0), type: "SHIFT" }));
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[lab receipt search]", error);
    return NextResponse.json({ error: "Failed to search receipts" }, { status: 500 });
  }
}
