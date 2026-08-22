/**
 * GET /api/auth/google/callback — finish Google sign-in.
 *
 * Google has verified who the person is. This route decides what they may see,
 * using exactly the same facility resolution as the password login:
 *
 *   1. the email must exist in `users` — signing in with Google never creates
 *      an account
 *   2. the account must hold a `workspaceusers` row — Google proves identity,
 *      not authorisation
 *   3. if they belong to several facilities, they pick one before any session
 *      cookie is issued
 */
import { pool } from '@/lib/db/pool';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  GOOGLE_PENDING_COOKIE,
  GOOGLE_STATE_COOKIE,
  callbackUrl,
  exchangeCodeForIdentity,
  isGoogleConfigured,
  signPendingIdentity,
} from '@/lib/auth/google';
import {
  buildSession,
  encodeSession,
  resolveFacility,
  SESSION_COOKIE_OPTIONS,
  appRoleFor,
} from '@/lib/auth/facility-session';

export const dynamic = 'force-dynamic';


/** Where each app role can actually land — mirrors ROLE_HOME on the login page. */
const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/dashboard',
  FINANCE_ADMIN: '/finance',
  HR_ADMIN: '/hr',
  INVENTORY_ADMIN: '/hospital',
  RECEPTION_ADMIN: '/reception',
};
const ROLE_MODULES: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  FINANCE_ADMIN: ['/finance'],
  HR_ADMIN: ['/hr', '/staff'],
  INVENTORY_ADMIN: ['/inventory', '/hospital'],
  RECEPTION_ADMIN: ['/reception'],
};

function backToLogin(request: NextRequest, error: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  const res = NextResponse.redirect(url);
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured() || !pool) {
    return backToLogin(request, 'Google sign-in is not configured on this deployment.');
  }

  const params = request.nextUrl.searchParams;

  // The user declined at Google's consent screen, or Google reported a problem.
  const googleError = params.get('error');
  if (googleError) {
    return backToLogin(
      request,
      googleError === 'access_denied' ? 'Sign-in was cancelled.' : 'Google sign-in failed.'
    );
  }

  const code = params.get('code');
  const state = params.get('state') ?? '';
  const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? '';
  const [nonce, encodedReturn = ''] = state.split('.');

  if (!code) return backToLogin(request, 'Google sign-in did not complete.');
  if (!expected || !nonce || !safeEqual(nonce, expected)) {
    // Either the cookie expired or this callback was not started by us.
    return backToLogin(request, 'Sign-in expired or was invalid. Please try again.');
  }

  const exchanged = await exchangeCodeForIdentity(code, callbackUrl(request));
  if (!exchanged.ok) return backToLogin(request, exchanged.reason);
  const { email, name } = exchanged.identity;

  // ── The Google identity must already exist as a user ─────────────────────
  let dbUser: { userid: string; name: string | null; email: string | null; isactive: boolean };
  try {
    const r = await pool.query(
      'SELECT userid, name, email, isactive FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (r.rows.length === 0) {
      // Deliberately not creating an account here: membership of a facility is
      // something an administrator grants, not something a Google login earns.
      return backToLogin(
        request,
        `No account for ${email}. Ask an administrator to add you.`
      );
    }
    dbUser = r.rows[0];
  } catch (e) {
    console.error('Google sign-in user lookup failed:', e);
    return backToLogin(request, 'Sign-in is unavailable right now. Please try again.');
  }

  if (dbUser.isactive === false) {
    return backToLogin(request, 'This account has been deactivated.');
  }

  // ── Same facility resolution as the password login ───────────────────────
  const chosen = params.get('workspaceId');
  const resolution = await resolveFacility(pool, dbUser.userid, chosen);

  if (resolution.kind === 'error') {
    return backToLogin(request, resolution.error);
  }

  if (resolution.kind === 'choose') {
    // Belongs to several facilities. Hand the choice to the login page, which
    // already renders a picker, and let it finish via /api/auth/google/select.
    // No session cookie is issued until a facility is chosen; the identity
    // Google verified is carried in a short-lived signed cookie so the pick
    // cannot be made on someone else's behalf.
    const url = new URL('/login', request.url);
    url.searchParams.set('googleEmail', email);
    const res = NextResponse.redirect(url);
    res.cookies.set(GOOGLE_PENDING_COOKIE, signPendingIdentity(email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    return res;
  }

  const membership = resolution.membership;
  const session = buildSession(
    { userid: dbUser.userid, name: dbUser.name ?? name, email: dbUser.email },
    membership,
    dbUser.email ?? email
  );
  const role = appRoleFor(membership);

  // Land somewhere this role can actually reach, honouring returnTo only when
  // the role is allowed there — otherwise the middleware bounces them straight
  // to /unauthorized.
  let target = ROLE_HOME[role] ?? '/dashboard';
  try {
    const requested = Buffer.from(encodedReturn, 'base64url').toString('utf-8');
    const allowed = ROLE_MODULES[role] ?? [];
    if (
      requested.startsWith('/') &&
      !requested.startsWith('//') &&
      (allowed.includes('*') || allowed.some((p) => requested.startsWith(p)))
    ) {
      target = requested;
    }
  } catch {
    /* keep the role's home */
  }

  const res = NextResponse.redirect(new URL(target, request.url));
  res.cookies.set('tibbna_session', encodeSession(session), SESSION_COOKIE_OPTIONS);
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}
