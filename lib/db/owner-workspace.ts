/**
 * Which facility owns a record, for routes that are handed only its id.
 *
 * A receipt reprint, a shift summary, a return, a sample detail page — each
 * arrives with one id and no workspace. Reading the row to find its workspace
 * is circular once row-level security is enforcing: the read needs a tenant,
 * and the tenant comes from the read.
 *
 * `app_owner_workspace` (migration 0067) is a SECURITY DEFINER function that
 * answers just that one question and returns a single uuid. Nothing about the
 * record leaks; the caller learns the owner of an id it already possessed,
 * which is what it needs to ask the question that matters — does this user
 * belong to that facility?
 */
import { sql } from "drizzle-orm";
import { rootDb } from "@/lib/db";

export type OwnedRecord =
  | "pos_sale"
  | "pos_shift"
  | "pos_return"
  | "accession_sample";

export async function ownerWorkspaceOf(
  kind: OwnedRecord,
  id: string,
): Promise<string | null> {
  if (!id) return null;
  const rows = (await rootDb.execute(
    sql`SELECT public.app_owner_workspace(${kind}, ${id}::uuid) AS workspaceid`,
  )) as unknown as Array<{ workspaceid: string | null }>;
  return rows[0]?.workspaceid ?? null;
}
