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
import { sql } from "drizzle-orm";
import { rootDb } from "@/lib/db";

/** The caller's role in the workspace, or null if they are not a member. */
export async function workspaceRoleOf(
  userid: string,
  workspaceid: string | null | undefined
): Promise<string | null> {
  if (!workspaceid) return null;
  // This lookup is what establishes the tenant, so it cannot run inside one.
  // `workspaceusers` is itself tenant-scoped: read through the ordinary
  // connection under the restricted role it returns nothing, every guard
  // answers 403, and the application locks itself out. The SECURITY DEFINER
  // function (migration 0068) stands outside the scheme it is guarding and
  // answers about the one membership it was asked about.
  const rows = (await rootDb.execute(
    sql`SELECT public.app_user_role_in(${userid}::uuid, ${workspaceid}::uuid) AS role`,
  )) as unknown as Array<{ role: string | null }>;
  return rows[0]?.role ?? null;
}

export async function isWorkspaceMember(
  userid: string,
  workspaceid: string | null | undefined
): Promise<boolean> {
  return (await workspaceRoleOf(userid, workspaceid)) !== null;
}
