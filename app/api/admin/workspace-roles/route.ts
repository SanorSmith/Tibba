import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaceRoles } from "@/lib/db/tables/workspace-roles";
import { eq, and } from "drizzle-orm";

// GET /api/admin/workspace-roles?workspacetype=hospital
export async function GET(req: NextRequest) {
  const workspacetype = req.nextUrl.searchParams.get("workspacetype");

  try {
    const where = workspacetype
      ? and(
          eq(workspaceRoles.workspacetype, workspacetype),
          eq(workspaceRoles.isactive, true)
        )
      : eq(workspaceRoles.isactive, true);

    const roles = await db
      .select()
      .from(workspaceRoles)
      .where(where)
      .orderBy(workspaceRoles.workspacetype, workspaceRoles.name);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching workspace roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST /api/admin/workspace-roles — create a new role
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspacetype, name, label, lablear, labelku, description } = body;

    if (!workspacetype || !name || !label) {
      return NextResponse.json(
        { error: "workspacetype, name, and label are required" },
        { status: 400 }
      );
    }

    const [role] = await db
      .insert(workspaceRoles)
      .values({ workspacetype, name, label, lablear, labelku, description })
      .returning();

    return NextResponse.json({ role }, { status: 201 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to create role";
    if (msg.includes("workspace_roles_type_name_unique")) {
      return NextResponse.json(
        { error: "A role with this name already exists for this workspace type" },
        { status: 409 }
      );
    }
    console.error("Error creating workspace role:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
