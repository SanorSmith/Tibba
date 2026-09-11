/**
 * Attach a sign-in account to an employment record that already exists, or
 * take one off.
 *
 * Linking could only happen at the moment an employee was created. Anyone
 * registered without it - which is the normal case, because the account often
 * arrives later - was stuck: the record showed "no login" for ever and no
 * screen could change it. `staff.userid` was written once at INSERT and the
 * only other statement touching it set it to NULL.
 *
 * The consequence is not cosmetic. Nothing joins that person's work to their
 * login, so they cannot be opened in the EHR and appointments booked against
 * the employment record point at nobody.
 *
 * The rules are the same ones the creation path and the picker already apply,
 * because this is the same act reached later:
 *
 *  - The caller must be allowed to manage accounts here at all.
 *  - The account must hold a role in this facility. Attaching a stranger's
 *    account would hand this facility a foothold on it.
 *  - Every role that account holds must be one the caller could grant, so an
 *    HR officer cannot bind an administrator's account to a record they
 *    manage. Every role, not any: `administrator` hidden among ordinary roles
 *    is exactly the case a looser check waves through.
 *  - One account to one employment record per facility, so two records cannot
 *    both claim the same person.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId, readSession } from '@/lib/workspace';
import { grantRuleFor } from '@/lib/auth/facility-session';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

const NOT_ALLOWED = {
  error: 'Only an administrator or an HR officer of this facility can attach a sign-in account.',
};

/** Attach `userId` to this employment record. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const session = await readSession(request);
  const canGrant = grantRuleFor(session?.role);
  if (!canGrant) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId ?? '').trim();
  if (!userId) {
    return NextResponse.json({ error: 'Which account?' }, { status: 400 });
  }

  // Inside the facility's scope: `staff` and `workspaceusers` both carry
  // row-level security, and off the tenant connection every query below
  // returns an empty result rather than an error - which these checks would
  // read as "nothing to object to".
  return await withTenant(workspaceId, async () => {
    const staff = await pool.query(
      `SELECT staffid, firstname, lastname, userid
         FROM staff WHERE staffid = $1 AND workspaceid = $2`,
      [id, workspaceId],
    );
    if (staff.rows.length === 0) {
      return NextResponse.json({ error: 'No such employment record here.' }, { status: 404 });
    }

    const held = await pool.query(
      `SELECT role FROM workspaceusers WHERE userid = $1 AND workspaceid = $2 ORDER BY role`,
      [userId, workspaceId],
    );
    if (held.rows.length === 0) {
      return NextResponse.json(
        { error: 'That account holds no role in this facility, so it cannot be attached here.' },
        { status: 403 },
      );
    }

    const beyond = held.rows.find((r) => !canGrant(r.role));
    if (beyond) {
      return NextResponse.json(
        {
          error: `That account is ${beyond.role} in this facility. Only an administrator can attach it to a staff record.`,
        },
        { status: 403 },
      );
    }

    const taken = await pool.query(
      `SELECT staffid, firstname, lastname
         FROM staff
        WHERE userid = $1 AND workspaceid = $2 AND staffid <> $3
        LIMIT 1`,
      [userId, workspaceId, id],
    );
    if (taken.rows.length > 0) {
      const other = taken.rows[0];
      return NextResponse.json(
        {
          error: `That account is already attached to ${String(other.firstname ?? '').trim()} ${String(other.lastname ?? '').trim()}`.trim() + '.',
        },
        { status: 409 },
      );
    }

    await pool.query(
      `UPDATE staff SET userid = $1, updatedat = NOW()
        WHERE staffid = $2 AND workspaceid = $3`,
      [userId, id, workspaceId],
    );

    return NextResponse.json({
      success: true,
      staffid: id,
      userId,
      roles: held.rows.map((r) => r.role),
    });
  });
}

/**
 * Detach the account, leaving the employment record and the account both
 * intact. Their roles are untouched: this says "this record is not that
 * person's login", not "this person no longer works here".
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const session = await readSession(request);
  const canGrant = grantRuleFor(session?.role);
  if (!canGrant) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  return await withTenant(workspaceId, async () => {
    const current = await pool.query(
      `SELECT s.userid,
              coalesce(
                (SELECT string_agg(wu.role, ',' ORDER BY wu.role)
                   FROM workspaceusers wu
                  WHERE wu.userid = s.userid AND wu.workspaceid = s.workspaceid),
                ''
              ) AS roles
         FROM staff s WHERE s.staffid = $1 AND s.workspaceid = $2`,
      [id, workspaceId],
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'No such employment record here.' }, { status: 404 });
    }
    if (!current.rows[0].userid) {
      return NextResponse.json({ success: true, staffid: id, unchanged: true });
    }

    // Detaching is a change to the account's standing here too, so it is held
    // to the same rule as attaching. Otherwise an HR officer could not link an
    // administrator's account but could unlink it.
    const roles = String(current.rows[0].roles ?? '').split(',').filter(Boolean);
    const beyond = roles.find((r) => !canGrant(r));
    if (beyond) {
      return NextResponse.json(
        {
          error: `That account is ${beyond} in this facility. Only an administrator can detach it.`,
        },
        { status: 403 },
      );
    }

    await pool.query(
      `UPDATE staff SET userid = NULL, updatedat = NOW()
        WHERE staffid = $1 AND workspaceid = $2`,
      [id, workspaceId],
    );

    return NextResponse.json({ success: true, staffid: id, detached: true });
  });
}
