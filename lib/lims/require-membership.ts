/**
 * Confirms the signed-in user actually belongs to the workspace they are
 * asking about.
 *
 * The lab pages already redirect non-members, but a page is not what guards
 * the data — the API is. Every lab and billing route took the workspace id
 * straight from the URL or body and checked only that *someone* was signed
 * in, so one lab's stock, invoices, payments, and shift takings were readable
 * and writable by any account that changed the id in the request. Workspace
 * separation held in the UI and nowhere else.
 */
import { db } from "@/lib/db";
import { workspaceusers } from "@/lib/db/tables/workspace";
import { and, eq } from "drizzle-orm";

/** The caller's role in the workspace, or null if they are not a member. */
export async function workspaceRoleOf(
  userid: string,
  workspaceid: string | null | undefined
): Promise<string | null> {
  if (!workspaceid) return null;
  const [row] = await db
    .select({ role: workspaceusers.role })
    .from(workspaceusers)
    .where(and(eq(workspaceusers.userid, userid), eq(workspaceusers.workspaceid, workspaceid)))
    .limit(1);
  return row?.role ?? null;
}

export async function isWorkspaceMember(
  userid: string,
  workspaceid: string | null | undefined
): Promise<boolean> {
  return (await workspaceRoleOf(userid, workspaceid)) !== null;
}
