/**
 * Who an appointment is with — resolved to both halves of one person.
 *
 * `appointments.doctorid` is a login (`users.userid`): it is what the EHR
 * matches when a doctor opens their own schedule. `appointments.staff_id` is
 * the employment record this ERP keeps. They are different identifiers for the
 * same human being, and every screen that books an appointment has a different
 * one to hand — the reception form lists staff, the EHR knows accounts.
 *
 * Writing whichever arrived into both columns is what hid appointments from
 * the doctors they were booked with. This takes either id and returns both,
 * so create and edit cannot drift apart again.
 *
 * Scoped to one facility on purpose: an id belonging to another hospital
 * resolves to nothing rather than to a person, so a booking cannot name
 * someone who does not work there. The database enforces the same rule; this
 * is so the caller gets an explanation instead of a constraint violation.
 */
import type { Pool } from 'pg';

export type DoctorIdentity = {
  /** The platform account, or null when this staff member has no login. */
  doctorUserId: string | null;
  /** The employment record, or null when the account has no staff row here. */
  staffRecordId: string | null;
  /** For messages to the person doing the booking. */
  staffName: string | null;
};

export async function resolveDoctorIdentity(
  pool: Pool,
  given: string,
  workspaceId: string
): Promise<DoctorIdentity | null> {
  // A malformed id is "nobody here", not a crash: the cast would otherwise
  // throw and surface as a 500 on what is really a bad request.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(given)) {
    return null;
  }

  const result = await pool.query(
    `SELECT u.userid::text  AS user_id,
            s.staffid::text AS staff_id,
            nullif(trim(coalesce(s.firstname, '') || ' ' ||
                        coalesce(s.lastname, '')), '') AS staff_name
       FROM (SELECT $1::uuid AS given) g
       LEFT JOIN workspaceusers wu
              ON wu.userid = g.given AND wu.workspaceid = $2
       LEFT JOIN users u ON u.userid = wu.userid
       LEFT JOIN staff s
              ON s.workspaceid = $2
             AND (s.staffid = g.given OR s.userid = u.userid)
      ORDER BY (s.staffid = g.given) DESC NULLS LAST
      LIMIT 1`,
    [given, workspaceId]
  );

  const row = result.rows[0];

  if (row?.user_id) {
    // A login belonging to this facility. It may also have a staff record.
    return {
      doctorUserId: row.user_id,
      staffRecordId: row.staff_id ?? null,
      staffName: row.staff_name ?? null,
    };
  }

  if (row?.staff_id) {
    // An employment record. Most have no login attached, which is not an
    // error — it only means nobody can open this appointment in the EHR.
    const linked = await pool.query(
      `SELECT userid::text AS userid
         FROM staff WHERE staffid = $1 AND workspaceid = $2`,
      [row.staff_id, workspaceId]
    );
    return {
      doctorUserId: linked.rows[0]?.userid ?? null,
      staffRecordId: row.staff_id,
      staffName: row.staff_name ?? null,
    };
  }

  return null;
}

/** The line reception should see when the booking cannot reach a schedule. */
export function noLoginWarning(identity: DoctorIdentity): string | undefined {
  if (identity.doctorUserId) return undefined;
  return `${
    identity.staffName || 'This member of staff'
  } has no user account in this facility, so the appointment will not appear in their EHR schedule. Link their staff record to a login to fix that.`;
}
