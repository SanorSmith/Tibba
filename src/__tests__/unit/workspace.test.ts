/**
 * Facility scoping helper.
 *
 * Every scoped API route calls getWorkspaceId() and returns 401 when it is
 * null. The critical property is that it fails *closed*: anything unusable —
 * missing cookie, corrupt cookie, session without a facility — must produce
 * null, never a facility id and never a throw. A helper that threw would turn
 * into a 500; one that returned a default would silently widen access to
 * another hospital's data, which is the bug this whole mechanism exists to
 * prevent.
 */
import type { NextRequest } from 'next/server';

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-to-pass-32';

import { getWorkspaceId, readSession } from '@/lib/workspace';
import { signSession } from '@/lib/auth/session-token';

const WORKSPACE = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

/** Minimal stand-in for NextRequest — only `cookies.get` is used. */
function requestWithCookie(value: string | undefined): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === 'tibbna_session' && value !== undefined ? { name, value } : undefined,
    },
  } as unknown as NextRequest;
}

function sessionCookie(session: Record<string, unknown>): Promise<string> {
  return signSession(session);
}

/** How the cookie used to be made — and how an attacker would make one. */
function unsignedCookie(session: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

const FULL_SESSION = {
  username: 'nurse@example.com',
  role: 'RECEPTION_ADMIN',
  userId: 'user-1',
  workspaceId: WORKSPACE,
  workspaceName: 'Hospital 1',
  facilityRole: 'nurse',
  email: 'nurse@example.com',
};

describe('readSession', () => {
  it('decodes a valid session cookie', async () => {
    const result = await readSession(requestWithCookie(await sessionCookie(FULL_SESSION)));
    expect(result).toEqual({
      workspaceId: WORKSPACE,
      workspaceName: 'Hospital 1',
      userId: 'user-1',
      email: 'nurse@example.com',
      role: 'RECEPTION_ADMIN',
    });
  });

  it('fills missing fields with null rather than undefined', async () => {
    const result = await readSession(requestWithCookie(await sessionCookie({ workspaceId: WORKSPACE })));
    expect(result).toEqual({
      workspaceId: WORKSPACE,
      workspaceName: null,
      userId: null,
      email: null,
      role: null,
    });
  });

  it('returns null when the cookie is absent', async () => {
    expect(await readSession(requestWithCookie(undefined))).toBeNull();
  });

  it.each([
    ['empty string', ''],
    ['not base64', '!!!not-base64!!!'],
    ['base64 of non-JSON', Buffer.from('hello').toString('base64')],
    ['base64 of a JSON fragment', Buffer.from('{"workspaceId":').toString('base64')],
  ])('returns null for a malformed cookie (%s)', async (_label, value) => {
    expect(await readSession(requestWithCookie(value))).toBeNull();
  });

  it('does not throw on any malformed input', async () => {
    for (const value of ['', 'x', '{}', Buffer.from('[]').toString('base64')]) {
      await expect(readSession(requestWithCookie(value))).resolves.not.toThrow();
    }
  });
});

describe('getWorkspaceId', () => {
  it('returns the facility from a valid session', async () => {
    expect(await getWorkspaceId(requestWithCookie(await sessionCookie(FULL_SESSION)))).toBe(WORKSPACE);
  });

  // Each of these is a way the old code could have leaked another facility's
  // data. All of them must come back null so the route 401s.
  it.each([
    ['no cookie at all', undefined],
    ['empty cookie', ''],
    ['garbage cookie', 'not-a-session'],
  ])('returns null when there is %s', async (_label, value) => {
    expect(await getWorkspaceId(requestWithCookie(value))).toBeNull();
  });

  it('returns null for a session that carries no facility', async () => {
    // A real case: a user who exists but was never granted access to any
    // facility. Must not fall back to a default hospital.
    const cookie = await sessionCookie({ username: 'someone', role: 'SUPER_ADMIN', userId: 'u1' });
    expect(await getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });

  it('returns null when workspaceId is explicitly null', async () => {
    const cookie = await sessionCookie({ ...FULL_SESSION, workspaceId: null });
    expect(await getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });

  it('does not invent a facility for a session that only has a name', async () => {
    const cookie = await sessionCookie({ workspaceName: 'Hospital 1' });
    expect(await getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });
});

describe('forged cookies', () => {
  // The reason this file exists now. Before the cookie was signed, each of
  // these worked: hand-write a payload, name any facility, get its data.
  it('rejects an unsigned cookie, however well formed', async () => {
    expect(await getWorkspaceId(requestWithCookie(unsignedCookie(FULL_SESSION)))).toBeNull();
  });

  it('rejects a payload edited after signing', async () => {
    const genuine = await sessionCookie(FULL_SESSION);
    const signature = genuine.slice(genuine.lastIndexOf('.'));
    const tampered = Buffer.from(
      JSON.stringify({ ...FULL_SESSION, workspaceId: 'another-facility' }),
    ).toString('base64url');
    expect(await getWorkspaceId(requestWithCookie(tampered + signature))).toBeNull();
  });

  it('rejects a cookie carrying a signature from somewhere else', async () => {
    const payload = Buffer.from(JSON.stringify(FULL_SESSION)).toString('base64url');
    expect(await getWorkspaceId(requestWithCookie(payload + '.' + payload))).toBeNull();
  });
});
