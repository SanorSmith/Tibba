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
import { Pool } from 'pg';
import { getWorkspaceId, readSession } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : null;

/** Only a facility administrator delegates; everyone else is a user of it. */
async function isFacilityAdministrator(request: NextRequest) {
  const session = await readSession(request);
  return session?.role === 'SUPER_ADMIN';
}

export async function GET(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  if (!(await isFacilityAdministrator(request))) {
    return NextResponse.json(
      { error: 'Only an administrator of this facility can manage accounts.' },
      { status: 403 },
    );
  }

  // Scoped by provenance, not by membership. A facility's administrator
  // manages the accounts their facility made - not every account that happens
  // to hold a role there, which would include people the platform owner
  // placed and other facilities' staff working here too.
  const rows = await pool.query(
    `SELECT u.userid, u.name, u.email, u.isactive, u.created_via, wu.role,
            s.staffid, trim(coalesce(s.firstname,'') || ' ' || coalesce(s.lastname,'')) AS staff_name
       FROM users u
       LEFT JOIN workspaceusers wu ON wu.userid = u.userid AND wu.workspaceid = $1
       LEFT JOIN staff s ON s.userid = u.userid AND s.workspaceid = $1
      WHERE u.created_by_workspaceid = $1
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

  return NextResponse.json({
    success: true,
    accounts: rows.rows,
    count: rows.rowCount,
    availableRoles: roles.rows,
  });
}

export async function POST(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  if (!(await isFacilityAdministrator(request))) {
    return NextResponse.json(
      { error: 'Only an administrator of this facility can create accounts.' },
      { status: 403 },
    );
  }

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

  // An address already in use belongs to a person who may work elsewhere on
  // the platform, and attaching them here would hand this facility a foothold
  // on someone else's account. Refused, and deliberately without confirming
  // whose it is: this facility has no business learning that.
  const taken = await pool.query(
    `SELECT 1 FROM users WHERE lower(trim(email)) = $1 LIMIT 1`,
    [email],
  );
  if (taken.rows.length > 0) {
    return NextResponse.json(
      {
        error:
          'That email cannot be registered here. If this person already has a Tibbna account, ask the platform owner to link it to your facility.',
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
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  if (!(await isFacilityAdministrator(request))) {
    return NextResponse.json(
      { error: 'Only an administrator of this facility can manage accounts.' },
      { status: 403 },
    );
  }

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

  await pool.query(
    `UPDATE workspaceusers SET role = $3 WHERE userid = $1 AND workspaceid = $2`,
    [userid, workspaceId, role],
  );

  return NextResponse.json({ success: true, userid, role });
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
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  if (!(await isFacilityAdministrator(request))) {
    return NextResponse.json(
      { error: 'Only an administrator of this facility can manage accounts.' },
      { status: 403 },
    );
  }

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The staff record keeps its history and loses its login. The trigger from
    // migration 004 refuses a link to a non-member, so this has to come first.
    await client.query(
      `UPDATE staff SET userid = NULL WHERE userid = $1 AND workspaceid = $2`,
      [userid, workspaceId],
    );
    const removed = await client.query(
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
}
