/**
 * Google sign-in helpers.
 *
 * The parts worth pinning are the ones that decide whether an identity is
 * trusted: the signed handoff cookie that carries a verified email to the
 * facility picker, and the configuration guard. Getting either wrong would let
 * someone claim an identity Google never confirmed.
 */
import {
  isGoogleConfigured,
  signPendingIdentity,
  readPendingIdentity,
  authorizationUrl,
  callbackUrl,
} from '@/lib/auth/google';

const SECRET = 'test-client-secret';
const CLIENT = 'test-client-id.apps.googleusercontent.com';

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT;
  process.env.GOOGLE_CLIENT_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
});

describe('isGoogleConfigured', () => {
  it('is true when both credentials are present', () => {
    expect(isGoogleConfigured()).toBe(true);
  });

  it.each(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])('is false without %s', (key) => {
    delete process.env[key];
    expect(isGoogleConfigured()).toBe(false);
  });
});

describe('pending identity cookie', () => {
  it('round-trips a verified email', () => {
    const cookie = signPendingIdentity('nurse@example.com');
    expect(readPendingIdentity(cookie)).toBe('nurse@example.com');
  });

  it('does not put the email in the cookie in readable form alone', () => {
    // It is base64url, so not secret — but it must be accompanied by a MAC,
    // which is what the tamper tests below rely on.
    const cookie = signPendingIdentity('nurse@example.com');
    expect(cookie).toContain('.');
    expect(cookie.split('.')).toHaveLength(2);
  });

  it('rejects a cookie whose payload was swapped for another identity', () => {
    // The attack this prevents: sign in as your own Google account, then edit
    // the cookie to name an administrator.
    const mine = signPendingIdentity('nurse@example.com');
    const [, mac] = mine.split('.');
    const forgedPayload = Buffer.from(`admin@example.com|${Date.now() + 60000}`).toString(
      'base64url'
    );
    expect(readPendingIdentity(`${forgedPayload}.${mac}`)).toBeNull();
  });

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signPendingIdentity('nurse@example.com');
    process.env.GOOGLE_CLIENT_SECRET = 'a-different-secret';
    expect(readPendingIdentity(cookie)).toBeNull();
  });

  it('rejects an expired cookie', () => {
    const { createHmac } = require('crypto');
    const payload = `nurse@example.com|${Date.now() - 1000}`;
    const mac = createHmac('sha256', SECRET).update(payload).digest('hex');
    const cookie = `${Buffer.from(payload).toString('base64url')}.${mac}`;
    expect(readPendingIdentity(cookie)).toBeNull();
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['no separator', 'abcdef'],
    ['missing mac', `${Buffer.from('a@b.c|9999999999999').toString('base64url')}.`],
    ['garbage base64', '!!!.abc'],
  ])('rejects a malformed cookie (%s)', (_label, cookie) => {
    expect(readPendingIdentity(cookie as string | undefined)).toBeNull();
  });

  it('returns null when Google is not configured', () => {
    const cookie = signPendingIdentity('nurse@example.com');
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(readPendingIdentity(cookie)).toBeNull();
  });
});

describe('authorizationUrl', () => {
  const url = () =>
    new URL(authorizationUrl('https://example.com/api/auth/google/callback', 'nonce.cmV0'));

  it('targets Google and asks for an authorization code', () => {
    const u = url();
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('response_type')).toBe('code');
  });

  it('requests only identity scopes', () => {
    expect(url().searchParams.get('scope')).toBe('openid email profile');
  });

  it('carries the state through', () => {
    expect(url().searchParams.get('state')).toBe('nonce.cmV0');
  });

  it('forces the account chooser', () => {
    // Staff often have several Google accounts; silently reusing the last one
    // is how someone ends up in the wrong facility.
    expect(url().searchParams.get('prompt')).toBe('select_account');
  });

  it('never includes the client secret', () => {
    expect(url().toString()).not.toContain(SECRET);
  });
});

describe('callbackUrl', () => {
  function req(headers: Record<string, string>, url = 'http://localhost:3000/api/auth/google') {
    return { url, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as Request;
  }

  it('derives from the request host', () => {
    expect(callbackUrl(req({ host: 'localhost:3000' }))).toBe(
      'http://localhost:3000/api/auth/google/callback'
    );
  });

  it('honours x-forwarded-proto behind a proxy', () => {
    // On Vercel the internal protocol is http even though the public URL is
    // https; getting this wrong makes the redirect_uri fail to match.
    expect(
      callbackUrl(req({ host: 'x.vercel.app', 'x-forwarded-proto': 'https' }))
    ).toBe('https://x.vercel.app/api/auth/google/callback');
  });

  it('prefers an explicit GOOGLE_REDIRECT_URI', () => {
    process.env.GOOGLE_REDIRECT_URI = 'https://pinned.example/cb';
    expect(callbackUrl(req({ host: 'ignored' }))).toBe('https://pinned.example/cb');
  });
});
