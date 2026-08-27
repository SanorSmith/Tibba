/**
 * API: /api/admin/update-user-role
 * - POST: Update user role in workspace
 * - Requires admin permissions
 */
import { NextRequest, NextResponse } from "next/server";
import { db, rootDb } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { users, workspaceusers, workspaceRoles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function POST(req: NextRequest) {
  // Require authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin permissions
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isGlobalAdmin) {
    return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
  }

  try {
    const { email, role, workspaceid } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // Validate role exists in DB
    const roleExists = await db
      .select()
      .from(workspaceRoles)
      .where(and(
        eq(workspaceRoles.name, role),
        eq(workspaceRoles.isactive, true)
      ))
      .limit(1);
    
    if (roleExists.length === 0) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find the user
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If workspaceid provided, update workspace user role
    if (workspaceid) {
      // These reads and writes are facility-scoped. Naming the workspace in a
      // WHERE is not the same as adopting it: without a tenant the SELECT
      // found nothing, so every update looked like a missing membership and
      // inserted a duplicate instead.
      return await withTenant(workspaceid, async () => {
      // Check if workspace user exists
      const existingWorkspaceUser = await db
        .select()
        .from(workspaceusers)
        .where(and(
          eq(workspaceusers.userid, targetUser[0].userid),
          eq(workspaceusers.workspaceid, workspaceid)
        ))
        .limit(1);

      if (existingWorkspaceUser.length === 0) {
        // Create new workspace user entry
        await db.insert(workspaceusers).values({
          userid: targetUser[0].userid,
          workspaceid: workspaceid,
          role: role,
        });
      } else {
        // Update existing role
        await db
          .update(workspaceusers)
          .set({ role: role })
          .where(and(
            eq(workspaceusers.userid, targetUser[0].userid),
            eq(workspaceusers.workspaceid, workspaceid)
          ));
      }

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role} in workspace`,
        email: email,
        role: role,
        workspaceid: workspaceid
      });
      });
    } else {
      // Every facility the person belongs to, which is deliberately more than
      // one tenant can reach: a single UPDATE with no tenant matches nothing
      // under row-level security, so this silently changed no roles at all.
      // The memberships come from the SECURITY DEFINER function, and each row
      // is then updated inside its own facility.
      const memberships = (await rootDb.execute(
        sql`SELECT workspaceid FROM public.app_user_memberships(${targetUser[0].userid}::uuid)`,
      )) as unknown as Array<{ workspaceid: string }>;

      for (const m of memberships) {
        await withTenant(m.workspaceid, async () =>
          db
            .update(workspaceusers)
            .set({ role: role })
            .where(
              and(
                eq(workspaceusers.userid, targetUser[0].userid),
                eq(workspaceusers.workspaceid, m.workspaceid),
              ),
            ));
      }

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role} in all workspaces`,
        email: email,
        role: role
      });
    }

  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
