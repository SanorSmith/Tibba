import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/tables/workspace";
import { eq } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    // Fetch workspace information
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceid))
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ workspace });
    });
  } catch (error) {
    console.error("Error fetching workspace info:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace info" },
      { status: 500 }
    );
  }
}
