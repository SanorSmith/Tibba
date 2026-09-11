/**
 * Accounts this facility created, and the making of new ones.
 *
 * A hospital administrator can give their own people a login without going to
 * the platform owner. What stops that from becoming a way to reach the rest of
 * the platform is not one check but four, and they are the point of this file:
 *
 *   - only an administrator of this facility may call it
 *   - the membership created is for this facility and no other
 *   - the role must exist in the platform's catalogue for this facility's type
 *   - `users.permissions` is never written
 *
 * The last is the one that matters most. `permissions: ["admin"]` is the flag
 * that makes someone a platform owner; an administrator who could set it could
 * mint another owner, and the delegation would not be a delegation.
 *
 * Accounts are created without a password. Sign-in here supports Google, and
 * one person setting another person's initial password - with no mechanism to
 * force a change - is worse than asking them to use an identity provider.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId, readSession } from '@/lib/workspace';
import { grantRuleFor } from '@/lib/auth/facility-session';
// The shared pool, not a second one built here. This route used to open its
// own `new Pool` against OPENEHR_DATABASE_URL - the same database through the
// pooler endpoint, so it read the right data, but it was a connection
// `withTenant` has no way to reach. Wrapping the handlers would have set the
// facility on a connection none of these queries ran on, which looks exactly
// like a fix and is not one.
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

/**
 * Who may create and manage accounts here, and which roles each may grant.
 *
 * An HR officer does the onboarding, so making them wait for an administrator
 * to finish it is a bottleneck with no safety in it. What an HR officer must
 * not do is grant `administrator`: that role appoints and removes everyone
 * else, so an HR officer who could grant it could promote themselves, and the
 * separation between the two would be decoration.
 *
 * Expressed as "which roles may this app role hand out" rather than a boolean,
 * because the interesting question is never whether someone may act but how
 * far. A facility administrator may grant anything the catalogue offers for
 * their facility type; an HR officer may grant all of it except the one role
 * that would let the grantee take the facility over.
 */
type Manager = { appRole: string; canGrant: (role: string) => boolean };

async function accountManager(request: NextRequest): Promise<Manager | null> {
  const session = await readSession(request);
  const appRole = session?.role;

  const canGrant = grantRuleFor(appRole);
  return canGrant && appRole ? { appRole, canGrant } : null;
}

const NOT_ALLOWED = {
  error:
    'Only an administrator or an HR officer of this facility can manage sign-in accounts.',
};

export async function GET(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const manager = await accountManager(request);
  if (!manager) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  // Every query below touches `workspaceusers` or `staff`, and both carry
  // row-level security. Without the facility on the connection they return
  // nothing at all - not an error, just an empty result - so a check that
  // reads someone's current roles concluded they held none. That made
  // "already has a role here" answer no for an account holding six, and
  // worse, let the guard protecting an administrator pass by finding
  // nothing to protect.
  return await withTenant(workspaceId, async () => {

  // Scoped by provenance, not by membership. A facility's administrator
  // manages the accounts their facility made - not every account that happens
  // to hold a role there, which would include people the platform owner
  // placed and other facilities' staff working here too.
  // Roles come back as a list. Since migration 0093 a person can hold several
  // here, and joining the membership table plainly returned them once per
  // role, so the screen showed the same person two or three times over.
  const rows = await pool.query(
    `SELECT u.userid, u.name, u.email, u.isactive, u.created_via,
            coalesce(
              array_agg(wu.role ORDER BY wu.role) FILTER (WHERE wu.role IS NOT NULL),
              '{}'
            ) AS roles,
            s.staffid,
            trim(coalesce(s.firstname,'') || ' ' || coalesce(s.lastname,'')) AS staff_name
       FROM users u
       LEFT JOIN workspaceusers wu ON wu.userid = u.userid AND wu.workspaceid = $1
       LEFT JOIN staff s ON s.userid = u.userid AND s.workspaceid = $1
      WHERE u.created_by_workspaceid = $1
      GROUP BY u.userid, u.name, u.email, u.isactive, u.created_via,
               s.staffid, s.firstname, s.lastname
      ORDER BY u.name NULLS LAST, u.email`,
    [workspaceId],
  );

  // The roles this facility may assign, so the form offers the catalogue's
  // answer rather than a list copied into the client - which is how the ERP's
  // login gate and the EHR's role unions drifted in the first place.
  const roles = await pool.query(
    `SELECT r.name, r.label, r.lablear AS label_ar,
            (r.permissions @> '["Open ERP"]'::jsonb) AS opens_erp
       FROM workspaces w
       JOIN workspace_roles r ON r.workspacetype = w.type AND r.isactive
      WHERE w.workspaceid = $1
      ORDER BY r.label`,
    [workspaceId],
  );

  // Filtered by what this caller may hand out, so the form offers only roles
  // the server would accept - the alternative is a dropdown with an entry that
  // fails on submit.
  return NextResponse.json({
    success: true,
    accounts: rows.rows,
    count: rows.rowCount,
    availableRoles: roles.rows.filter((r) => manager.canGrant(r.name)),
    grantsAdministrator: manager.canGrant('administrator'),
  });
  });
}

export async function POST(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const manager = await accountManager(request);
  if (!manager) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  // Every query below touches `workspaceusers` or `staff`, and both carry
  // row-level security. Without the facility on the connection they return
  // nothing at all - not an error, just an empty result - so a check that
  // reads someone's current roles concluded they held none. That made
  // "already has a role here" answer no for an account holding six, and
  // worse, let the guard protecting an administrator pass by finding
  // nothing to protect.
  return await withTenant(workspaceId, async () => {

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const name = String(body?.name ?? '').trim();
  const role = String(body?.role ?? '').trim();

  if (!email || !name || !role) {
    return NextResponse.json(
      { error: 'An email, a name and a role are all required.', required: ['email', 'name', 'role'] },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }

  // The role has to be one this type of facility actually offers. Without
  // this a hospital could be given `lab_technician`, and worse, any string at
  // all - `workspaceusers.role` is plain text.
  const validRole = await pool.query(
    `SELECT r.name
       FROM workspaces w
       JOIN workspace_roles r ON r.workspacetype = w.type AND r.isactive
      WHERE w.workspaceid = $1 AND r.name = $2
      LIMIT 1`,
    [workspaceId, role],
  );
  if (validRole.rows.length === 0) {
    return NextResponse.json(
      { error: `"${role}" is not a role this facility can assign.` },
      { status: 400 },
    );
  }

  if (!manager.canGrant(role)) {
    return NextResponse.json(
      {
        error: `An HR officer cannot grant "${role}". That role appoints and removes everyone else in the facility, so only an administrator can hand it out.`,
      },
      { status: 403 },
    );
  }

  // An address already in use belongs to a person who may work elsewhere on
  // the platform, and attaching them here would hand this facility a foothold
  // on someone else's account. Still refused - but the old message sent
  // everyone to the admin panel, including people whose account is already a
  // member of this very facility and could simply be linked. Two situations,
  // two answers.
  //
  // Whether they are a member here is the one fact this facility is entitled
  // to: it already appears in the link picker. Nothing else about the account
  // is disclosed, because an address in use elsewhere is not this facility's
  // business.
  const taken = await pool.query(
    `SELECT EXISTS (
              SELECT 1 FROM workspaceusers wu
               WHERE wu.userid = u.userid AND wu.workspaceid = $2
            ) AS member_here
       FROM users u
      WHERE lower(trim(u.email)) = $1
      LIMIT 1`,
    [email, workspaceId],
  );
  if (taken.rows.length > 0) {
    return NextResponse.json(
      {
        error: taken.rows[0].member_here
          ? 'That email already has a Tibbna account and it already holds a role in this facility. Choose "Link an existing account" rather than creating a second one.'
          : 'That email already has a Tibbna account, and that account holds no role in this facility. Nobody here can attach it: a platform administrator has to assign the account to this facility from the admin panel first.',
      },
      { status: 409 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // No password, and no `permissions` - the column is left to its default so
    // that a new account cannot arrive holding the platform-admin flag.
    const created = await client.query(
      `INSERT INTO users (name, email, isactive, created_by_workspaceid, created_via, createdat, updatedat)
       VALUES ($1, $2, true, $3, 'erp-staff-form', now(), now())
       RETURNING userid, name, email`,
      [name, email, workspaceId],
    );
    const user = created.rows[0];

    // This facility, and only this one.
    await client.query(
      `INSERT INTO workspaceusers (workspaceid, userid, role, createdat)
       VALUES ($1, $2, $3, now())`,
      [workspaceId, user.userid, role],
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, user: { ...user, role } }, { status: 201 });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[staff/accounts] create failed:', e);
    return NextResponse.json(
      { error: 'Could not create the account.', details: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  } finally {
    client.release();
  }
  });
}

/**
 * Change the role an account holds in this facility.
 *
 * Only for accounts this facility created. An account the platform owner made,
 * or one belonging to another facility's staff who also work here, is not this
 * administrator's to re-role - `created_by_workspaceid` is what draws that
 * line, and NULL means nobody's.
 */
export async function PATCH(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const manager = await accountManager(request);
  if (!manager) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  // Every query below touches `workspaceusers` or `staff`, and both carry
  // row-level security. Without the facility on the connection they return
  // nothing at all - not an error, just an empty result - so a check that
  // reads someone's current roles concluded they held none. That made
  // "already has a role here" answer no for an account holding six, and
  // worse, let the guard protecting an administrator pass by finding
  // nothing to protect.
  return await withTenant(workspaceId, async () => {

  const body = await request.json().catch(() => null);
  const userid = String(body?.userid ?? '').trim();
  const role = String(body?.role ?? '').trim();
  if (!userid || !role) {
    return NextResponse.json({ error: 'A user and a role are required.' }, { status: 400 });
  }

  const owned = await pool.query(
    `SELECT 1 FROM users WHERE userid = $1 AND created_by_workspaceid = $2 LIMIT 1`,
    [userid, workspaceId],
  );
  if (owned.rows.length === 0) {
    return NextResponse.json(
      { error: 'That account was not created by this facility, so it cannot be changed here.' },
      { status: 403 },
    );
  }

  const validRole = await pool.query(
    `SELECT 1 FROM workspaces w
       JOIN workspace_roles r ON r.workspacetype = w.type AND r.isactive
      WHERE w.workspaceid = $1 AND r.name = $2 LIMIT 1`,
    [workspaceId, role],
  );
  if (validRole.rows.length === 0) {
    return NextResponse.json(
      { error: `"${role}" is not a role this facility can assign.` },
      { status: 400 },
    );
  }

  if (!manager.canGrant(role)) {
    return NextResponse.json(
      {
        error: `An HR officer cannot grant "${role}". Only an administrator can.`,
      },
      { status: 403 },
    );
  }

  // Every role they hold here, because a person can hold several since
  // migration 0093 and "their role" is no longer a single thing.
  const current = await pool.query(
    `SELECT role FROM workspaceusers WHERE userid = $1 AND workspaceid = $2`,
    [userid, workspaceId],
  );
  const heldRoles: string[] = current.rows.map((r) => r.role);

  // Cannot change someone who holds any role the caller could not grant.
  // Without this an HR officer could demote the facility's administrator,
  // which is the same power as promoting themselves, reached from the other
  // direction. Checked across all of their roles, not just one: holding
  // `administrator` alongside `nurse` must protect them just as much.
  const protectedRole = heldRoles.find((r) => !manager.canGrant(r));
  if (protectedRole) {
    return NextResponse.json(
      {
        error: `That person is ${protectedRole} in this facility. Only an administrator can change them.`,
      },
      { status: 403 },
    );
  }

  // Which role is being changed. The caller names it when the person holds
  // several; with one there is no ambiguity to resolve.
  const from = String(body?.from ?? '').trim() || heldRoles[0];

  if (heldRoles.length > 1 && !body?.from) {
    // Refusing beats guessing. The old statement had no role in its WHERE
    // clause, so it rewrote every row this person had in the facility to the
    // same value — which the primary key now rejects outright, and which would
    // silently have destroyed four of five roles before it did.
    return NextResponse.json(
      {
        error: `That person holds ${heldRoles.length} roles here (${heldRoles.join(', ')}). Say which one to change, or remove the one you do not want.`,
        roles: heldRoles,
      },
      { status: 409 },
    );
  }

  if (!heldRoles.includes(from)) {
    return NextResponse.json(
      { error: `They do not hold "${from}" in this facility.` },
      { status: 400 },
    );
  }

  if (heldRoles.includes(role)) {
    // Already theirs. Nothing to do, and the key would refuse the write.
    return NextResponse.json({ success: true, userid, role, unchanged: true });
  }

  await pool.query(
    `UPDATE workspaceusers SET role = $4 WHERE userid = $1 AND workspaceid = $2 AND role = $3`,
    [userid, workspaceId, from, role],
  );

  return NextResponse.json({ success: true, userid, role, replaced: from });
  });
}

/**
 * Remove someone from this facility.
 *
 * The membership goes; the account does not. A person can work in several
 * facilities - deactivating the user would end their access everywhere, which
 * is not this administrator's decision to make. Their staff record stays too,
 * unlinked, because employment history outlives access.
 */
export async function DELETE(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const manager = await accountManager(request);
  if (!manager) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  // Every query below touches `workspaceusers` or `staff`, and both carry
  // row-level security. Without the facility on the connection they return
  // nothing at all - not an error, just an empty result - so a check that
  // reads someone's current roles concluded they held none. That made
  // "already has a role here" answer no for an account holding six, and
  // worse, let the guard protecting an administrator pass by finding
  // nothing to protect.
  return await withTenant(workspaceId, async () => {

  const userid = request.nextUrl.searchParams.get('userid');
  if (!userid) return NextResponse.json({ error: 'Which account?' }, { status: 400 });

  const owned = await pool.query(
    `SELECT 1 FROM users WHERE userid = $1 AND created_by_workspaceid = $2 LIMIT 1`,
    [userid, workspaceId],
  );
  if (owned.rows.length === 0) {
    return NextResponse.json(
      { error: 'That account was not created by this facility, so it cannot be removed here.' },
      { status: 403 },
    );
  }

  const held = await pool.query(
    `SELECT role FROM workspaceusers WHERE userid = $1 AND workspaceid = $2`,
    [userid, workspaceId],
  );
  const heldRoles: string[] = held.rows.map((r) => r.role);

  // Checked across every role, not just one. Someone who is an administrator
  // as well as a nurse must be protected by the administrator, whichever row
  // happens to come back first.
  const protectedRole = heldRoles.find((r) => !manager.canGrant(r));
  if (protectedRole) {
    return NextResponse.json(
      {
        error: `That person is ${protectedRole} in this facility. Only an administrator can remove them.`,
      },
      { status: 403 },
    );
  }

  // One role, or the whole membership. Naming a role takes that role away and
  // leaves the rest; naming none removes the person from the facility. The
  // screen's per-role cross sends a role, its Remove button does not.
  const role = request.nextUrl.searchParams.get('role');
  if (role && !heldRoles.includes(role)) {
    return NextResponse.json(
      { error: `They do not hold "${role}" in this facility.` },
      { status: 400 },
    );
  }
  const removingLastRole = !role || heldRoles.length <= 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The staff record keeps its history and loses its login. The trigger from
    // migration 004 refuses a link to a non-member, so this has to come first.
    // Only when the last role goes: taking one role from someone who keeps
    // others must not unlink their staff record.
    if (removingLastRole) {
      await client.query(
        `UPDATE staff SET userid = NULL WHERE userid = $1 AND workspaceid = $2`,
        [userid, workspaceId],
      );
    }
    const removed = role
      ? await client.query(
          `DELETE FROM workspaceusers WHERE userid = $1 AND workspaceid = $2 AND role = $3`,
          [userid, workspaceId, role],
        )
      : await client.query(
          `DELETE FROM workspaceusers WHERE userid = $1 AND workspaceid = $2`,
          [userid, workspaceId],
        );
    await client.query('COMMIT');
    return NextResponse.json({ success: true, removed: removed.rowCount });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[staff/accounts] remove failed:', e);
    return NextResponse.json({ error: 'Could not remove that account from this facility.' }, { status: 500 });
  } finally {
    client.release();
  }
  });
}

/**
 * Give an existing account another role in this facility.
 *
 * Separate from PATCH, which replaces one role with another. Adding is not
 * replacing, and conflating them is how someone loses four roles by picking a
 * fifth from a dropdown.
 *
 * The same four guards as everywhere else in this file: the caller must manage
 * accounts here, the role must exist for this facility type, the caller must
 * be allowed to grant it, and `users.permissions` is never touched.
 */
export async function PUT(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const manager = await accountManager(request);
  if (!manager) return NextResponse.json(NOT_ALLOWED, { status: 403 });

  // Every query below touches `workspaceusers` or `staff`, and both carry
  // row-level security. Without the facility on the connection they return
  // nothing at all - not an error, just an empty result - so a check that
  // reads someone's current roles concluded they held none. That made
  // "already has a role here" answer no for an account holding six, and
  // worse, let the guard protecting an administrator pass by finding
  // nothing to protect.
  return await withTenant(workspaceId, async () => {

  const body = await request.json().catch(() => null);
  const userid = String(body?.userid ?? '').trim();
  const role = String(body?.role ?? '').trim();
  if (!userid || !role) {
    return NextResponse.json({ error: 'Which account, and which role?' }, { status: 400 });
  }

  const validRole = await pool.query(
    `SELECT 1
       FROM workspaces w
       JOIN workspace_roles r ON r.workspacetype = w.type AND r.isactive
      WHERE w.workspaceid = $1 AND r.name = $2 LIMIT 1`,
    [workspaceId, role],
  );
  if (validRole.rows.length === 0) {
    return NextResponse.json(
      { error: `"${role}" is not a role this facility can assign.` },
      { status: 400 },
    );
  }

  if (!manager.canGrant(role)) {
    return NextResponse.json(
      { error: `An HR officer cannot grant "${role}". Only an administrator can.` },
      { status: 403 },
    );
  }

  // Already theirs. Saying so beats a primary key violation the caller has to
  // interpret.
  const existing = await pool.query(
    `SELECT 1 FROM workspaceusers WHERE userid = $1 AND workspaceid = $2 AND role = $3 LIMIT 1`,
    [userid, workspaceId, role],
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ success: true, userid, role, unchanged: true });
  }

  await pool.query(
    `INSERT INTO workspaceusers (workspaceid, userid, role, createdat)
     VALUES ($1, $2, $3, now())`,
    [workspaceId, userid, role],
  );

  return NextResponse.json({ success: true, userid, role, added: true });
  });
}
