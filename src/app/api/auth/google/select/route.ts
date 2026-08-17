/**
 * POST /api/auth/google/select — finish a Google sign-in for someone who
 * belongs to more than one facility.
 *
 * The callback has already verified the identity with Google and parked it in
 * a short-lived signed cookie. This route only accepts the facility choice; it
 * never takes the identity from the request body, so a caller cannot sign in
 * as somebody else by posting their email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { GOOGLE_PENDING_COOKIE, readPendingIdentity } from '@/lib/auth/google';
import {
  appRoleFor,
  buildSession,
  encodeSession,
  resolveFacility,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/auth/facility-session';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL || process.env.DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : null;

export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const email = readPendingIdentity(request.cookies.get(GOOGLE_PENDING_COOKIE)?.value);
  if (!email) {
    return NextResponse.json(
      { error: 'Sign-in expired. Please start again.' },
      { status: 401 }
    );
  }

  const { workspaceId } = await request.json().catch(() => ({ workspaceId: null }));
  if (!workspaceId) {
    return NextResponse.json({ error: 'Choose a facility' }, { status: 400 });
  }

  let dbUser: { userid: string; name: string | null; email: string | null; isactive: boolean };
  try {
    const r = await pool.query(
      'SELECT userid, name, email, isactive FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 403 });
    }
    dbUser = r.rows[0];
  } catch (e) {
    console.error('Google facility selection lookup failed:', e);
    return NextResponse.json({ error: 'Sign-in is unavailable right now.' }, { status: 503 });
  }

  if (dbUser.isactive === false) {
    return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
  }

  // resolveFacility re-checks membership, so a forged workspaceId is rejected
  // here rather than trusted because the picker offered it.
  const resolution = await resolveFacility(pool, dbUser.userid, workspaceId);
  if (resolution.kind === 'error') {
    return NextResponse.json({ error: resolution.error }, { status: resolution.status });
  }
  if (resolution.kind !== 'resolved') {
    return NextResponse.json({ error: 'Choose a facility' }, { status: 400 });
  }

  const membership = resolution.membership;
  const session = buildSession(dbUser, membership, dbUser.email ?? email);
  const role = appRoleFor(membership);

  const res = NextResponse.json({ success: true, role, user: session });
  res.cookies.set('tibbna_session', encodeSession(session), SESSION_COOKIE_OPTIONS);
  res.cookies.delete(GOOGLE_PENDING_COOKIE);
  return res;
}
