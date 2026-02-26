import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role → allowed path prefixes (* means all)
const ROLE_MODULES: Record<string, string[]> = {
  SUPER_ADMIN:      ['*'],
  FINANCE_ADMIN:    ['/finance'],
  HR_ADMIN:         ['/hr'],
  INVENTORY_ADMIN:  ['/inventory'],
  RECEPTION_ADMIN:  ['/reception'],
};

// Paths that are always public
const PUBLIC_PATHS = ['/login', '/unauthorized', '/api'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function getSession(request: NextRequest) {
  const cookie = request.cookies.get('tibbna_session')?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(Buffer.from(cookie, 'base64').toString());
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (isPublic(pathname)) return NextResponse.next();

  const session = getSession(request);

  // Not authenticated → redirect to login
  if (!session?.username || !session?.role) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  // Check session expiry (8 hours)
  if (Date.now() - session.timestamp > 8 * 60 * 60 * 1000) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnTo', pathname);
    const res = NextResponse.redirect(url);
    res.cookies.set('tibbna_session', '', { maxAge: 0 });
    return res;
  }

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
