import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { seedDepartments } from "@/lib/db/seed-departments";

/**
 * POST /api/d/[workspaceid]/departments/seed
 * Seeds default departments for a workspace
 */
// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
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
  } catch (error) {
    console.error("Error seeding departments:", error);
    return NextResponse.json(
      { error: "Failed to seed departments" },
      { status: 500 }
    );
  }
}
