/**
 * GET /api/auth/google — begin Google sign-in.
 *
 * Redirects to Google's consent screen. The `state` parameter is a random
 * value stored in an httpOnly cookie and checked on the way back, which is
 * what stops an attacker from feeding the callback a code of their own.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  GOOGLE_STATE_COOKIE,
  authorizationUrl,
  callbackUrl,
  isGoogleConfigured,
} from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    const url = new URL('/login', request.url);
    url.searchParams.set(
      'error',
      'Google sign-in is not configured on this deployment.'
    );
    return NextResponse.redirect(url);
  }

  // Where to land after a successful sign-in. Only same-origin paths, so this
  // cannot be turned into an open redirect.
  const requested = request.nextUrl.searchParams.get('returnTo') ?? '';
  const returnTo =
    requested.startsWith('/') && !requested.startsWith('//') ? requested : '';

  const nonce = randomBytes(16).toString('hex');
  // returnTo travels inside state so it survives the round trip without a
  // second cookie; the nonce half is what actually gets compared.
  const state = `${nonce}.${Buffer.from(returnTo).toString('base64url')}`;

  const response = NextResponse.redirect(
    authorizationUrl(callbackUrl(request), state)
  );
  response.cookies.set(GOOGLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // the sign-in should take well under ten minutes
    path: '/',
  });
  return response;
}
