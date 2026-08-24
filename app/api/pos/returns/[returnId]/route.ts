/**
 * POS Return Detail API
 *
 * GET — Get details of a specific return including items and refund transactions.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posReturns,
  posReturnItems,
  posRefundTransactions,
  posReturnReasons,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { ownerWorkspaceOf } from "@/lib/db/owner-workspace";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { returnId } = await params;

    // Only the record id is known here, so the owning facility is
    // resolved first and membership decides whether to go on.
    const workspaceid = await ownerWorkspaceOf("pos_return", returnId);
    if (!workspaceid) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return withTenant(workspaceid, async () => {

    // Get return with reason
    const [returnRecord] = await db
      .select({
        return: posReturns,
        reason: posReturnReasons,
      })
      .from(posReturns)
      .leftJoin(
        posReturnReasons,
        eq(posReturns.returnreasonid, posReturnReasons.reasonid)
      )
      .where(eq(posReturns.returnid, returnId))
      .limit(1);

    if (!returnRecord) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    // Get return items
    const items = await db
      .select()
      .from(posReturnItems)
      .where(eq(posReturnItems.returnid, returnId));

    // Get refund transactions
    const refunds = await db
      .select()
      .from(posRefundTransactions)
      .where(eq(posRefundTransactions.returnid, returnId));

    return NextResponse.json({
      ...returnRecord,
      items,
      refunds,
    });
    });
  } catch (error) {
    console.error("[Return Detail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return details" },
      { status: 500 }
    );
  }
}
