/**
 * Work as a different one of your roles, without signing out.
 *
 * Someone holding administrator and hr_officer in the same hospital signed in
 * as the administrator every time, because the session is built from whichever
 * role opens the most and nothing ever asked. That is the right default and a
 * poor only option.
 *
 * Two things this is not. It is not a way to gain access: the requested role
 * is checked against the person's actual memberships in their current
 * facility, read fresh from the database rather than believed from the cookie,
 * so asking for a role you do not hold is refused. And it is not a way to
 * change facility: the workspace comes from the existing session, so this can
 * only move sideways within the facility you are already in.
 *
 * Unlike the platform's equivalent, choosing here really does narrow what you
 * can open, because the app role in this cookie is what the middleware gates
 * modules on. Choosing HR officer means seeing HR and not Finance. That is the
 * point of choosing, and switching back is one request away.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { readSession } from '@/lib/workspace';
import {
  buildSession,
  encodeSession,
  sessionCookieOptions,
  canLogIn,
  landingPathFor,
  WS_ROLE_TO_APP_ROLE,
} from '@/lib/auth/facility-session';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const session = await readSession(request);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const role = String(body?.role ?? '').trim();
  if (!role) {
    return NextResponse.json({ error: 'Which role?' }, { status: 400 });
  }

  // Read fresh, and only for the facility they are already in. The session
  // says who they are; the database says what they may be.
  const held = await pool.query(
    `SELECT mem.role AS ws_role, w.name AS workspace_name, w.type AS ws_type,
            r.permissions AS role_permissions,
            seeded.declared AS type_declares_erp
       FROM public.app_user_memberships($1) AS mem
       JOIN workspaces w ON w.workspaceid = mem.workspaceid
       LEFT JOIN workspace_roles r
              ON r.workspacetype = w.type AND r.name = mem.role AND r.isactive
       LEFT JOIN LATERAL (
         SELECT bool_or(r2.permissions @> '["Open ERP"]'::jsonb) AS declared
           FROM workspace_roles r2
          WHERE r2.workspacetype = w.type AND r2.isactive
       ) seeded ON true
      WHERE mem.workspaceid = $2`,
    [session.userId, session.workspaceId],
  );

  const match = held.rows.find((r) => r.ws_role === role);
  if (!match) {
    return NextResponse.json(
      { error: 'You do not hold that role in this facility.' },
      { status: 403 },
    );
  }

  // A role can be held and still not open this application: a doctor works
  // through the EHR. Switching into one would strand them on a page they
  // cannot use, so it is refused with a reason rather than allowed to fail
  // later as "Access Denied".
  if (!canLogIn(role, match.role_permissions, match.type_declares_erp)) {
    return NextResponse.json(
      { error: `The ${role} role does not open this application.` },
      { status: 403 },
    );
  }

  const next = buildSession(
    {
      userId: session.userId,
      name: null,
      email: session.email ?? null,
    } as never,
    {
      workspaceid: session.workspaceId,
      workspace_name: match.workspace_name,
      ws_type: match.ws_type,
      ws_role: role,
    },
    session.username ?? undefined,
    role,
  );

  const response = NextResponse.json({
    success: true,
    role,
    appRole: WS_ROLE_TO_APP_ROLE[role] ?? 'RECEPTION_ADMIN',
    // Where they belong now. Their previous page may not be open to the role
    // they just chose, and landing on "Access Denied" immediately after
    // switching would read as the switch having failed.
    redirectTo: landingPathFor(WS_ROLE_TO_APP_ROLE[role] ?? 'RECEPTION_ADMIN'),
  });

  response.cookies.set(
    'tibbna_session',
    await encodeSession(next),
    sessionCookieOptions(request.headers.get('host')),
  );

  return response;
}

/** The roles this person could switch to, for the menu that offers them. */
export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const session = await readSession(request);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const held = await pool.query(
    `SELECT mem.role AS ws_role, r.label,
            r.permissions AS role_permissions,
            seeded.declared AS type_declares_erp
       FROM public.app_user_memberships($1) AS mem
       JOIN workspaces w ON w.workspaceid = mem.workspaceid
       LEFT JOIN workspace_roles r
              ON r.workspacetype = w.type AND r.name = mem.role AND r.isactive
       LEFT JOIN LATERAL (
         SELECT bool_or(r2.permissions @> '["Open ERP"]'::jsonb) AS declared
           FROM workspace_roles r2
          WHERE r2.workspacetype = w.type AND r2.isactive
       ) seeded ON true
      WHERE mem.workspaceid = $2
      ORDER BY r.label NULLS LAST, mem.role`,
    [session.userId, session.workspaceId],
  );

  // Only roles that actually open this application. Offering a doctor role
  // here would be offering a door that does not lead anywhere.
  const roles = held.rows
    .filter((r) => canLogIn(r.ws_role, r.role_permissions, r.type_declares_erp))
    .map((r) => ({ role: r.ws_role, label: r.label ?? r.ws_role }));

  // Where this person belongs right now. The chooser needs it for the case
  // where there is nothing to choose: it forwards rather than rendering a page
  // with one button, and it must forward somewhere the role can actually open.
  //
  // It used to send them to `/`, which is a static landing page with a "Go to
  // Login" button that no role's module list contains — so a super admin saw
  // what looked like being signed out, and everyone else was bounced to
  // /unauthorized. That was worse than the problem it replaced.
  const currentRole = session.facilityRole ?? null;
  const appRole = currentRole
    ? WS_ROLE_TO_APP_ROLE[currentRole] ?? 'RECEPTION_ADMIN'
    : session.role ?? 'RECEPTION_ADMIN';

  return NextResponse.json({
    roles,
    current: currentRole,
    home: landingPathFor(appRole),
  });
}
