import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';

const SESSION_COOKIE = 'tibbna_session';
const DEFAULT_WORKSPACE_ID = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd'; // Hospital 1

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

function decodeCookie(cookieValue: string | undefined): RawSession | null {
  if (!cookieValue) return null;
  try {
    return JSON.parse(Buffer.from(cookieValue, 'base64').toString());
  } catch {
    return null;
  }
}

/**
 * Resolve full user record from session.
 * - Reads `tibbna_session` cookie (works for both Server Components and Route Handlers)
 * - Falls back to looking up the user in `users` table by email if session is partial
 * - Always returns a workspaceId (defaults to Hospital 1 if missing)
 */
export async function getCurrentUser(request?: NextRequest): Promise<SessionUser | null> {
  let cookieValue: string | undefined;

  if (request) {
    cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get(SESSION_COOKIE)?.value;
  }

  const session = decodeCookie(cookieValue);
  if (!session?.username || !session?.role) return null;

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

  return {
    userId: session.userId ?? userRecord?.userid ?? '00000000-0000-0000-0000-000000000000',
    username: session.username,
    name: userRecord?.name ?? session.username,
    email: userRecord?.email ?? session.email ?? `${session.username}@hospital.com`,
    role: session.role,
    workspaceId: session.workspaceId ?? DEFAULT_WORKSPACE_ID,
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
