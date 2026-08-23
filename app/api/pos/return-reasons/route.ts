/**
 * POS Return Reasons API
 *
 * GET — List active return reasons for a workspace.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posReturnReasons } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }
    // The id arrives from the caller, so belonging has to be checked
    // before it is trusted as the tenant.
    if (!workspaceId || !(await isWorkspaceMember(user.userid, workspaceId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return withTenant(workspaceId, async () => {

    const reasons = await db
      .select()
      .from(posReturnReasons)
      .where(
        and(
          eq(posReturnReasons.workspaceid, workspaceId),
          eq(posReturnReasons.isactive, true)
        )
      )
      .orderBy(asc(posReturnReasons.displayorder));

    return NextResponse.json({ reasons });
    });
  } catch (error) {
    console.error("[Return Reasons] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return reasons" },
      { status: 500 }
    );
  }
}
