import type { NextRequest } from 'next/server';

/**
 * Facility (workspace) scoping for API routes.
 *
 * Every ERP table our app owns carries a `workspaceid` identifying which
 * facility the row belongs to. Reads must filter on it and writes must set it,
 * otherwise one hospital sees another's invoices, payroll and stock.
 *
 * The facility is decided at login (from `workspaceusers`) and carried in the
 * `tibbna_session` cookie — see src/app/api/auth/login/route.ts.
 *
 * Patient data is deliberately NOT scoped: patients, their medical and
 * insurance information are shared across facilities by design, so those
 * queries must not use this.
 */

export interface SessionInfo {
  workspaceId: string | null;
  workspaceName: string | null;
  userId: string | null;
  email: string | null;
  role: string | null;
}

/** Decode the login session cookie. Returns null when absent or malformed. */
export function readSession(request: NextRequest): SessionInfo | null {
  const raw = request.cookies.get('tibbna_session')?.value;
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    return {
      workspaceId: s.workspaceId ?? null,
      workspaceName: s.workspaceName ?? null,
      userId: s.userId ?? null,
      email: s.email ?? null,
      role: s.role ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * The facility the caller is currently working in.
 *
 * Returns null when there is no usable session — callers should treat that as
 * "show nothing" rather than "show everything", so a missing cookie can never
 * silently widen access to every facility's data.
 */
export function getWorkspaceId(request: NextRequest): string | null {
  return readSession(request)?.workspaceId ?? null;
}
