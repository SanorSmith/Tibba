/**
 * POST /api/lims/billing/receipts/reprint
 *
 * Records that a duplicate receipt was produced, and by whom. Reprinting is
 * an audit event rather than a print job: a second copy of a paid receipt is
 * in circulation afterwards, and someone has to own that.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labReceiptReprints } from "@/lib/db/tables/lab-pos";
import { getUser } from "@/lib/user";
import { z } from "zod";
import { isWorkspaceMember } from "@/lib/lims/require-membership";

const reprintSchema = z.object({
  workspaceId: z.string().uuid(),
  receiptType: z.enum(["PAYMENT", "REFUND", "SHIFT"]),
  paymentId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
  printFormat: z.enum(["PDF", "THERMAL", "BROWSER"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reprintSchema.safeParse(await request.json());
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


    if (d.receiptType === "SHIFT" && !d.shiftId) {
      return NextResponse.json({ error: "shiftId required for SHIFT receipts" }, { status: 400 });
    }
    if (d.receiptType !== "SHIFT" && !d.paymentId) {
      return NextResponse.json({ error: "paymentId required for payment receipts" }, { status: 400 });
    }

    const [log] = await db
      .insert(labReceiptReprints)
      .values({
        workspaceid: d.workspaceId,
        receipttype: d.receiptType,
        invoiceid: d.invoiceId || null,
        paymentid: d.paymentId || null,
        shiftid: d.shiftId || null,
        printformat: d.printFormat,
        reason: d.reason || null,
        reprintedby: user.userid,
        reprintedbyname: user.name || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      reprintId: log.id,
      isReprint: true,
      printFormat: d.printFormat,
    });
  } catch (error) {
    console.error("[lab receipt reprint]", error);
    return NextResponse.json({ error: "Failed to log reprint" }, { status: 500 });
  }
}
