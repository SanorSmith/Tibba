import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session-token';
import {
  clearSessionCookieOptions,
  ROLE_MODULES,
} from '@/lib/auth/facility-session';
import type { NextRequest } from 'next/server';

// Role → allowed path prefixes (* means all)
// One definition, in facility-session.ts - see the note there.

// Paths that are always public
const PUBLIC_PATHS = ['/login', '/unauthorized', '/api'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

// Verifies rather than merely decodes. This used to JSON.parse whatever was
// in the cookie, so a hand-written payload naming any facility and any role
// was accepted here and everywhere downstream.
async function getSession(request: NextRequest) {
  return verifySession<{
    username?: string;
    role?: string;
    timestamp?: number;
    workspaceId?: string;
  }>(request.cookies.get('tibbna_session')?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (isPublic(pathname)) return NextResponse.next();

  const session = await getSession(request);

  // Not authenticated → redirect to login
  if (!session?.username || !session?.role) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  // Check session expiry (8 hours). A signed payload with no timestamp is
  // treated as expired rather than as eternal.
  if (!session.timestamp || Date.now() - session.timestamp > 8 * 60 * 60 * 1000) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnTo', pathname);
    const res = NextResponse.redirect(url);
    // Must carry the same domain it was set with, or a .tibbna.com cookie
    // survives the clear and signs the user straight back in.
    res.cookies.set(
      'tibbna_session',
      '',
      clearSessionCookieOptions(request.headers.get('host')),
    );
    return res;
  }

  // Choosing which of your roles to work as is not a module, so no role's
  // list contains it. Gating it by role would mean only a super admin could
  // reach it, and switching away from any other role would be a one-way trip
  // out of the app. Signed in is the right bar here: the endpoint behind the
  // page still checks every requested role against real memberships.
  if (pathname.startsWith('/choose-role')) return NextResponse.next();

  // Super admin — allow everything
  const allowed = ROLE_MODULES[session.role] ?? [];
  if (allowed.includes('*')) return NextResponse.next();

  // Check if current path is within allowed modules
  const hasAccess = allowed.some(prefix => pathname.startsWith(prefix));
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|fonts).*)'],
};
