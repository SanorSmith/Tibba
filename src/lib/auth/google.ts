/**
 * Google sign-in (OAuth 2.0 authorization code flow).
 *
 * Matches how the Tibbna platform authenticates: the user proves who they are
 * to Google, and we match the verified email against `users`. There is no
 * password involved, and none is created.
 *
 * The identity still has to exist in `users` and hold a `workspaceusers` row —
 * signing in with Google does not create accounts or grant facility access. It
 * only proves the email. Everything after that is the same facility resolution
 * the password login uses.
 *
 * Configure with:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 * and register the callback URL in the Google Cloud console:
 *   http://localhost:3000/api/auth/google/callback
 *   https://<your-domain>/api/auth/google/callback
 */

import { createHmac, timingSafeEqual } from 'crypto';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const GOOGLE_STATE_COOKIE = 'tibbna_oauth_state';

/**
 * Holds the Google-verified email between the callback and the facility
 * picker, for accounts that belong to more than one facility.
 *
 * It is httpOnly and additionally signed, so a forged cookie cannot be used to
 * claim an identity Google never confirmed. The signing key is the client
 * secret, which is already server-only and always present when Google sign-in
 * is configured at all.
 */
export const GOOGLE_PENDING_COOKIE = 'tibbna_google_pending';

const PENDING_TTL_MS = 10 * 60 * 1000;

export function signPendingIdentity(email: string): string {
  const payload = `${email}|${Date.now() + PENDING_TTL_MS}`;
  const mac = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET!)
    .update(payload)
    .digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${mac}`;
}

/** Returns the email if the cookie is authentic and unexpired, else null. */
export function readPendingIdentity(cookie: string | undefined): string | null {
  if (!cookie || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const [encoded, mac] = cookie.split('.');
  if (!encoded || !mac) return null;

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf-8');
  } catch {
    return null;
  }

  const expected = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET)
    .update(payload)
    .digest('hex');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const sep = payload.lastIndexOf('|');
  if (sep === -1) return null;
  const email = payload.slice(0, sep);
  const expiry = Number(payload.slice(sep + 1));
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;

  return email || null;
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The callback URL Google will redirect back to. Derived from the incoming
 * request so it works on localhost, a Vercel preview and production without
 * three separate settings — but it must match a URI registered in the Google
 * console exactly.
 */
export function callbackUrl(request: Request): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI;
  if (explicit) return explicit;
  const url = new URL(request.url);
  // x-forwarded-proto matters behind Vercel's proxy, where url.protocol can be
  // http even though the public URL is https.
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function authorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Always show the account chooser: staff often have several Google
    // accounts, and silently reusing the last one is how people end up in the
    // wrong facility.
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/** Decode a JWT payload. Does not verify — see verifyIdTokenClaims. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf-8'
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Exchange the authorization code for tokens and read the identity.
 *
 * The id_token arrives over TLS directly from Google's token endpoint, in
 * response to a request authenticated with our client secret — so it did not
 * pass through the browser and its signature does not need separate
 * verification. The claims still do: `aud` must be our client, `iss` must be
 * Google, and it must not be expired.
 */
export async function exchangeCodeForIdentity(
  code: string,
  redirectUri: string
): Promise<{ ok: true; identity: GoogleIdentity } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    return { ok: false, reason: 'Could not reach Google.' };
  }

  if (!res.ok) {
    // Google's error body can contain the client_secret echoed back in some
    // misconfigurations, so it is deliberately not logged verbatim.
    return { ok: false, reason: `Google rejected the sign-in (HTTP ${res.status}).` };
  }

  const body = (await res.json().catch(() => null)) as { id_token?: string } | null;
  if (!body?.id_token) return { ok: false, reason: 'Google did not return an identity token.' };

  const claims = decodeJwtPayload(body.id_token);
  if (!claims) return { ok: false, reason: 'Identity token could not be read.' };

  const { aud, iss, exp, email, email_verified, name, picture } = claims as Record<string, any>;

  if (aud !== process.env.GOOGLE_CLIENT_ID) {
    return { ok: false, reason: 'Identity token was issued for a different application.' };
  }
  if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
    return { ok: false, reason: 'Identity token was not issued by Google.' };
  }
  if (typeof exp !== 'number' || exp * 1000 < Date.now()) {
    return { ok: false, reason: 'Identity token has expired.' };
  }
  if (typeof email !== 'string' || !email) {
    return { ok: false, reason: 'Google did not return an email address.' };
  }
  if (email_verified === false) {
    // An unverified Google address could belong to someone else entirely.
    return { ok: false, reason: 'That Google account has an unverified email address.' };
  }

  return {
    ok: true,
    identity: {
      email,
      emailVerified: email_verified !== false,
      name: typeof name === 'string' ? name : null,
      picture: typeof picture === 'string' ? picture : null,
    },
  };
}
