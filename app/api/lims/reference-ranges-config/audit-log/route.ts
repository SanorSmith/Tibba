import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { testReferenceAuditLog } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// GET - Fetch audit logs for a specific range or all ranges in a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const rangeid = searchParams.get("rangeid");

    const whereConditions: any[] = [
      eq(testReferenceAuditLog.workspaceid, workspaceid),
    ];

    if (rangeid) {
      whereConditions.push(eq(testReferenceAuditLog.rangeid, rangeid));
    }

    const logs = await db
      .select()
      .from(testReferenceAuditLog)
      .where(and(...whereConditions))
      .orderBy(desc(testReferenceAuditLog.createdat))
      .limit(100);

    return NextResponse.json({ logs });
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
