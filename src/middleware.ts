import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isLoginPage = pathname.startsWith('/login');
  const isPublicAsset = pathname.startsWith('/images') || pathname.startsWith('/fonts') || pathname.startsWith('/public');

  // Allow login page and public assets through
  if (isLoginPage || isPublicAsset) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('tibbna_session');

  if (!sessionCookie || !sessionCookie.value) {
    // No session — redirect to login with returnTo param
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate cookie format (base64-encoded username)
  try {
    const decoded = atob(sessionCookie.value);
    if (!/^[a-zA-Z0-9_]+$/.test(decoded)) {
      // Invalid cookie content — clear it and redirect
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('tibbna_session', '', { maxAge: 0 });
      return response;
    }
  } catch {
    // Cookie decode failed — clear and redirect
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('tibbna_session', '', { maxAge: 0 });
    return response;
  }

  // Authenticated — allow access
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
