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
import { getWorkspaceId, readSession } from '@/lib/workspace';

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

function sessionCookie(session: Record<string, unknown>): string {
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
  it('decodes a valid session cookie', () => {
    const result = readSession(requestWithCookie(sessionCookie(FULL_SESSION)));
    expect(result).toEqual({
      workspaceId: WORKSPACE,
      workspaceName: 'Hospital 1',
      userId: 'user-1',
      email: 'nurse@example.com',
      role: 'RECEPTION_ADMIN',
    });
  });

  it('fills missing fields with null rather than undefined', () => {
    const result = readSession(requestWithCookie(sessionCookie({ workspaceId: WORKSPACE })));
    expect(result).toEqual({
      workspaceId: WORKSPACE,
      workspaceName: null,
      userId: null,
      email: null,
      role: null,
    });
  });

  it('returns null when the cookie is absent', () => {
    expect(readSession(requestWithCookie(undefined))).toBeNull();
  });

  it.each([
    ['empty string', ''],
    ['not base64', '!!!not-base64!!!'],
    ['base64 of non-JSON', Buffer.from('hello').toString('base64')],
    ['base64 of a JSON fragment', Buffer.from('{"workspaceId":').toString('base64')],
  ])('returns null for a malformed cookie (%s)', (_label, value) => {
    expect(readSession(requestWithCookie(value))).toBeNull();
  });

  it('does not throw on any malformed input', () => {
    for (const value of ['', 'x', '{}', Buffer.from('[]').toString('base64')]) {
      expect(() => readSession(requestWithCookie(value))).not.toThrow();
    }
  });
});

describe('getWorkspaceId', () => {
  it('returns the facility from a valid session', () => {
    expect(getWorkspaceId(requestWithCookie(sessionCookie(FULL_SESSION)))).toBe(WORKSPACE);
  });

  // Each of these is a way the old code could have leaked another facility's
  // data. All of them must come back null so the route 401s.
  it.each([
    ['no cookie at all', undefined],
    ['empty cookie', ''],
    ['garbage cookie', 'not-a-session'],
  ])('returns null when there is %s', (_label, value) => {
    expect(getWorkspaceId(requestWithCookie(value))).toBeNull();
  });

  it('returns null for a session that carries no facility', () => {
    // A real case: a user who exists but was never granted access to any
    // facility. Must not fall back to a default hospital.
    const cookie = sessionCookie({ username: 'someone', role: 'SUPER_ADMIN', userId: 'u1' });
    expect(getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });

  it('returns null when workspaceId is explicitly null', () => {
    const cookie = sessionCookie({ ...FULL_SESSION, workspaceId: null });
    expect(getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });

  it('does not invent a facility for a session that only has a name', () => {
    const cookie = sessionCookie({ workspaceName: 'Hospital 1' });
    expect(getWorkspaceId(requestWithCookie(cookie))).toBeNull();
  });
});
