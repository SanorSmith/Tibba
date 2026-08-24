/**
 * Which facility a composition belongs to, recorded where it can be enforced.
 *
 * EHRbase has no workspace concept, so until now a test order reached the
 * right lab by carrying `LabWorkspaceId: <uuid>` inside a free-text
 * Description, with every lab fetching every composition in the instance and
 * filtering the rest out in JavaScript. Separation that lives in a regex is
 * separation that a wording change can switch off.
 *
 * Ownership is written to Postgres at creation time and read back under
 * row-level security (migration 0072), so "which compositions are mine" is a
 * question the database answers. The Description keeps its LabWorkspaceId for
 * now: compositions created before this table exists are only findable that
 * way, and dropping it would strand them.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface CompositionOwner {
  compositionUid: string;
  /** The facility that created it. */
  workspaceId: string;
  /** The facility it was routed to, when that differs — a lab, typically. */
  ownerWorkspaceId?: string | null;
  ehrId?: string | null;
  patientId?: string | null;
  kind?: string;
}

/**
 * Records a composition against its facility. Must be called inside
 * `withTenant`, so the insert is checked by the same policy that will govern
 * the read.
 */
export async function recordCompositionOwner(o: CompositionOwner): Promise<void> {
  if (!o.compositionUid || !o.workspaceId) return;
  await db.execute(sql`
    INSERT INTO composition_ownership
      (composition_uid, workspaceid, ownerworkspaceid, ehrid, patientid, kind)
    VALUES (
      ${o.compositionUid}, ${o.workspaceId}::uuid,
      ${o.ownerWorkspaceId ?? null}::uuid, ${o.ehrId ?? null},
      ${o.patientId ?? null}::uuid, ${o.kind ?? "composition"}
    )
    ON CONFLICT (composition_uid) DO UPDATE
      SET ownerworkspaceid = EXCLUDED.ownerworkspaceid,
          ehrid = COALESCE(EXCLUDED.ehrid, composition_ownership.ehrid),
          patientid = COALESCE(EXCLUDED.patientid, composition_ownership.patientid)
  `);
}

/**
 * The composition ids this facility may see — its own and those routed to it.
 *
 * Returns null when the table has nothing for this facility, which is not the
 * same as "nothing is yours": compositions written before ownership was
 * recorded are not in here at all. Callers treat null as "fall back to the
 * old filter" rather than as an empty result, so the change does not hide
 * existing orders.
 */
export async function ownedCompositionUids(
  workspaceId: string,
): Promise<string[] | null> {
  const rows = (await db.execute(sql`
    SELECT composition_uid FROM composition_ownership
  `)) as unknown as Array<{ composition_uid: string }>;
  if (rows.length === 0) return null;
  return rows.map((r) => r.composition_uid);
}
