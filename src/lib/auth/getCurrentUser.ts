import { cookies } from 'next/headers';
import { verifySession } from './session-token';
import { WS_ROLE_TO_APP_ROLE } from './facility-session';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';

const SESSION_COOKIE = 'tibbna_session';

export interface SessionUser {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: string;
  workspaceId: string;
}

interface RawSession {
  username?: string;
  role?: string;
  timestamp?: number;
  userId?: string;
  workspaceId?: string;
  email?: string;
}

function decodeCookie(cookieValue: string | undefined): Promise<RawSession | null> {
  return verifySession<RawSession>(cookieValue);
}

/**
 * Resolve full user record from session.
 * - Reads `tibbna_session` cookie (works for both Server Components and Route Handlers)
 * - Falls back to looking up the user in `users` table by email if session is partial
 * - Returns null when the session carries no facility. There is deliberately no
 *   default: a missing workspaceId used to silently resolve to Hospital 1, which
 *   showed one facility's stock to every other facility.
 */
export async function getCurrentUser(request?: NextRequest): Promise<SessionUser | null> {
  let cookieValue: string | undefined;

  if (request) {
    cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get(SESSION_COOKIE)?.value;
  }

  const session = await decodeCookie(cookieValue);
  if (!session?.username || !session?.role) return null;
  if (!session.workspaceId) return null;

  // Hydrate from DB (resolve real userId by email)
  let userRecord: any = null;
  try {
    const lookupEmail =
      session.email ??
      (session.username.includes('@') ? session.username : `${session.username}@hospital.com`);

    const result = await query(
      'SELECT userid, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [lookupEmail]
    );
    if (result.rows.length > 0) {
      userRecord = result.rows[0];
    } else {
      // Try by name
      const byName = await query(
        'SELECT userid, name, email FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [session.username]
      );
      if (byName.rows.length > 0) userRecord = byName.rows[0];
    }
  } catch (err) {
    console.error('getCurrentUser: DB lookup failed', err);
  }

  const userId =
    session.userId ?? userRecord?.userid ?? '00000000-0000-0000-0000-000000000000';

  // A signature proves the payload came from this server. It does not prove
  // the claims are still true: a membership can be revoked, or a role changed,
  // long after a cookie was issued, and the cookie would go on asserting the
  // old answer for its full eight hours. So the membership is re-read here on
  // every request, and the role is derived from it rather than believed from
  // the cookie — which also means a valid signature cannot carry a role the
  // user does not hold.
  let membership;
  try {
    // Through the SECURITY DEFINER function, not the table. This check runs
    // before any tenant is established — it is what establishes it — and
    // `workspaceusers` is tenant-scoped, so a direct read returns nothing
    // under the restricted role and every request becomes a 401.
    const result = await query(
      `SELECT public.app_user_role_in($1, $2) AS ws_role`,
      [userId, session.workspaceId]
    );
    membership = result.rows[0]?.ws_role ? result.rows[0] : undefined;
  } catch (err) {
    console.error('getCurrentUser: membership check failed', err);
    // Fail closed. An unavailable database must not become a way in.
    return null;
  }

  if (!membership) return null;

  return {
    userId,
    username: session.username,
    name: userRecord?.name ?? session.username,
    email: userRecord?.email ?? session.email ?? `${session.username}@hospital.com`,
    role: WS_ROLE_TO_APP_ROLE[membership.ws_role] ?? 'RECEPTION_ADMIN',
    workspaceId: session.workspaceId,
  };
}

/**
 * Helper for API routes — returns 401 response if not authenticated.
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { userId, workspaceId, name } = auth;
 */
export async function requireAuth(request: NextRequest): Promise<SessionUser | Response> {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Login required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return user;
}
