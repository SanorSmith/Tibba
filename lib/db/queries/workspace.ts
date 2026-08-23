import { db, rootDb } from "@/lib/db";
import {
  workspaces,
  workspaceusers,
  Workspace,
  WorkspaceUserRole,
  UserWorkspace,
} from "@/lib/db/tables/workspace";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { cache } from "react";

export async function getWorkspaceById(
  workspaceId: string,
): Promise<Workspace | null> {
  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceId))
      .limit(1);

    return workspace || null;
  } catch (error) {
    console.error("Error getting workspace by ID:", error);
    return null;
  }
}

export const getUserWorkspaces = cache(async function (
  userId: string,
  role?: WorkspaceUserRole,
): Promise<UserWorkspace[]> {
  try {
    // Which facilities a user belongs to has to be answerable before they are
    // inside one — this is the question that decides which one they enter.
    // `workspaceusers` is tenant-scoped, so reading it here through the normal
    // connection returns nothing under the restricted role, and every page
    // that calls this (124 of them) would redirect to an empty picker.
    // The SECURITY DEFINER function (migration 0070) answers for one named
    // user and returns memberships only.
    const memberships = (await rootDb.execute(
      sql`SELECT workspaceid, role FROM public.app_user_memberships(${userId}::uuid)`,
    )) as unknown as Array<{ workspaceid: string; role: WorkspaceUserRole }>;

    const wanted = role
      ? memberships.filter((m) => m.role === role)
      : memberships;
    if (wanted.length === 0) return [];

    // The workspace rows themselves read normally: migration 0068 opens
    // SELECT on `workspaces` so facilities can see each other by name.
    const rows = await rootDb
      .select()
      .from(workspaces)
      .where(inArray(workspaces.workspaceid, wanted.map((m) => m.workspaceid)))
      .orderBy(desc(workspaces.createdat));

    const roleOf = new Map(wanted.map((m) => [m.workspaceid, m.role]));
    return rows.map((workspace) => ({
      workspace,
      role: roleOf.get(workspace.workspaceid)!,
    }));
  } catch (error) {
    console.error("Error getting user workspaces:", error);
    return [];
  }
});
