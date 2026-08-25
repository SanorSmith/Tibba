import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * GET /api/d/[workspaceid]/doctors
 * - Returns list of users in the workspace with role 'doctor'
 * - Auth required
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {

  try {
    const rows = await db
      .select({ userid: users.userid, name: users.name, email: users.email })
      .from(workspaceusers)
      .innerJoin(users, eq(workspaceusers.userid, users.userid))
      .where(and(eq(workspaceusers.workspaceid, workspaceid), eq(workspaceusers.role, "doctor")));

    return NextResponse.json({ doctors: rows });
  } catch (e) {
    console.error("[doctors][GET] error:", e);
    return NextResponse.json({ error: "Failed to load doctors" }, { status: 500 });
  }
  });
}
