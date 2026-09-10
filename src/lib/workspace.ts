import type { NextRequest } from 'next/server';
import { verifySession } from './auth/session-token';

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
  /** The module-access role this app gates on: SUPER_ADMIN, HR_ADMIN and so on. */
  role: string | null;
  /**
   * The platform facility role behind it: administrator, hr_officer, nurse.
   * Both are in the cookie and neither replaces the other - the role switcher
   * needs to know which facility role is currently active, and the user menu
   * shows it, so dropping it here meant reading the cookie twice.
   */
  facilityRole: string | null;
  username: string | null;
}

/**
 * Verify the login session cookie. Returns null when absent, unsigned, or
 * tampered with.
 *
 * This used to JSON.parse the cookie without checking anything, which meant
 * the workspace id below — the value 181 routes scope their queries by — was
 * whatever the caller wrote. Scoping to an attacker's choice of facility is
 * not scoping.
 */
export async function readSession(request: NextRequest): Promise<SessionInfo | null> {
  const raw = request.cookies.get('tibbna_session')?.value;
  const s = await verifySession<Record<string, string | null>>(raw);
  if (!s) return null;
  return {
      workspaceId: s.workspaceId ?? null,
      workspaceName: s.workspaceName ?? null,
      userId: s.userId ?? null,
      email: s.email ?? null,
      role: s.role ?? null,
      facilityRole: s.facilityRole ?? null,
      username: s.username ?? null,
  };
}

/**
 * The facility the caller is currently working in.
 *
 * Returns null when there is no usable session — callers should treat that as
 * "show nothing" rather than "show everything", so a missing cookie can never
 * silently widen access to every facility's data.
 */
export async function getWorkspaceId(request: NextRequest): Promise<string | null> {
  return (await readSession(request))?.workspaceId ?? null;
}
