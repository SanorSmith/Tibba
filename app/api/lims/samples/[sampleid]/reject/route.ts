import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { ValidationService } from "@/lib/lims/validation-service";
import { db } from "@/lib/db";
import { workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * POST /api/lims/samples/[sampleid]/reject
 * Reject validation with reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;
    const body = await request.json();
    const { reason, workspaceid } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    // The id comes from the request body, so belonging has to be proved
    // before it is used as the tenant identity.
    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

    // Get user's role in this workspace
    const workspaceUser = await db.query.workspaceusers.findFirst({
      where: and(
        eq(workspaceusers.userid, user.userid),
        eq(workspaceusers.workspaceid, workspaceid)
      ),
    });

    const userRole = workspaceUser?.role || "user";

    const result = await ValidationService.rejectValidation({
      sampleid,
      userid: user.userid,
      userrole: userRole,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Rejection failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Validation rejected successfully",
    });
    });
  } catch (error) {
    console.error("[API] Error rejecting validation:", error);
    return NextResponse.json(
      { error: "Failed to reject validation" },
      { status: 500 }
    );
  }
}
