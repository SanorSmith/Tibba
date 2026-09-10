/**
 * Redeem a one-time ticket from the platform and start a session here.
 *
 * The EHR and this application share a database and a domain but not a
 * session mechanism, so neither can mint the other's cookie. The platform
 * issues a ticket instead (migration 0089) and sends the person here with it.
 *
 * The ticket says who is arriving and which facility they asked for. It does
 * not say what they may do, and this route does not take its word for
 * anything else: membership and role are read from the database, through the
 * same `resolveFacility` the login page uses. A ticket issued before a
 * membership was revoked therefore opens nothing, and a ticket for a role
 * that cannot use this application is refused at the door.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  resolveFacility,
  buildSession,
  encodeSession,
  canLogIn,
  sessionCookieOptions,
  landingPathFor,
} from '@/lib/auth/facility-session';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : null;

/** Send failures to the login page with a reason, never to a blank screen. */
function refuse(request: NextRequest, reason: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!pool) return refuse(request, 'database-not-configured');

  const token = request.nextUrl.searchParams.get('token');
  if (!token) return refuse(request, 'missing-token');

  // Claim the ticket and read it in one statement. Doing it as an UPDATE that
  // only matches an unused, unexpired row means two simultaneous redemptions
  // cannot both succeed - the second updates nothing - without a transaction
  // or a lock held across the work that follows.
  let claim;
  try {
    claim = await pool.query(
      `UPDATE sso_handoff
          SET usedat = now()
        WHERE token = $1
          AND usedat IS NULL
          AND expiresat > now()
        RETURNING userid::text AS userid, workspaceid::text AS workspaceid`,
      [token],
    );
  } catch (e) {
    console.error('[handoff] could not claim ticket:', e);
    return refuse(request, 'handoff-failed');
  }

  if (claim.rows.length === 0) {
    // Used, expired, or never existed. All three mean the same to the person
    // holding it, and distinguishing them out loud would help someone probing.
    return refuse(request, 'handoff-expired');
  }

  const { userid, workspaceid } = claim.rows[0];

  const dbUser = await pool.query(
    `SELECT userid, name, email FROM users WHERE userid = $1 AND isactive IS NOT FALSE LIMIT 1`,
    [userid],
  );
  if (dbUser.rows.length === 0) return refuse(request, 'unknown-user');

  // Membership and role from the database, now, for the facility named on the
  // ticket - not from the ticket.
  const resolution = await resolveFacility(pool, userid, workspaceid);
  if (resolution.kind !== 'resolved') {
    return refuse(request, 'no-access-to-facility');
  }

  const membership = resolution.membership;
  if (!canLogIn(membership.ws_role, membership.role_permissions, membership.type_declares_erp)) {
    return refuse(request, 'role-cannot-open-erp');
  }

  const session = buildSession(dbUser.rows[0], membership, dbUser.rows[0].email ?? undefined);

  // Through the role chooser, not straight to the module.
  //
  // Not `/`, for the reason that cost a day once: only SUPER_ADMIN may open
  // the root, so everyone else crossed over with a valid session and met
  // "Access Denied" on the very next request. But landing them directly in
  // their module skipped the question of *which* role they are crossing as,
  // which is how someone holding five roles arrived as the administrator every
  // time even after the chooser existed. This route is a third way in and it
  // was still bypassing it.
  //
  // The chooser forwards on by itself when there is only one role, so nobody
  // who has one notices the extra step.
  const res = NextResponse.redirect(new URL('/choose-role', request.url));
  void landingPathFor;
  res.cookies.set(
    'tibbna_session',
    await encodeSession(session),
    sessionCookieOptions(request.headers.get('host')),
  );
  return res;
}
