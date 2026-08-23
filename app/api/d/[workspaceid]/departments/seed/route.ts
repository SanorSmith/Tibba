import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { seedDepartments } from "@/lib/db/seed-departments";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * POST /api/d/[workspaceid]/departments/seed
 * Seeds default departments for a workspace
 */
export async function POST(
  req: NextRequest,
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

    // Check workspace access and ensure user is admin
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow workspace owners/admins to seed departments
    // For now, allow any authenticated workspace member to seed
    // You can add role checking here if needed

    const seededDepartments = await seedDepartments(workspaceid);

    return NextResponse.json(
      {
        success: true,
        message: `Seeded ${seededDepartments.length} departments`,
        departments: seededDepartments,
      },
      { status: 201 }
    );
    });
  } catch (error) {
    console.error("Error seeding departments:", error);
    return NextResponse.json(
      { error: "Failed to seed departments" },
      { status: 500 }
    );
  }
}
