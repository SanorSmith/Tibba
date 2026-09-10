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
/**
 * Accounts seen to be switched off, and when we looked.
 *
 * All four sign-in paths refuse a deactivated account, but this session is a
 * signed cookie good for eight hours and nothing re-reads the account after it
 * is issued. So deactivating someone took their next sign-in away and left the
 * tab they already had open working all afternoon. Access is normally
 * withdrawn for a reason that will not wait that long.
 *
 * Cached because `readSession` runs on every one of the 181 routes that scope
 * by facility, and a database round trip on each is not worth paying to notice
 * a deactivation a few seconds sooner. The window is the exposure: at worst
 * they keep working for the length of one entry.
 */
const activeChecked = new Map<string, { active: boolean; at: number }>();
const ACTIVE_CACHE_MS = 30_000;

async function accountIsActive(userId: string): Promise<boolean> {
  const seen = activeChecked.get(userId);
  if (seen && Date.now() - seen.at < ACTIVE_CACHE_MS) return seen.active;

  try {
    // Imported here rather than at the top of the file: this module is small
    // and widely imported, and pulling the pg pool into every one of those
    // graphs for a check most of them make once is not free.
    const { pool } = await import('@/lib/db/pool');
    const r = await pool.query('SELECT isactive FROM users WHERE userid = $1', [userId]);

    // No row means the account was deleted while they were signed in.
    const active = r.rows.length > 0 && r.rows[0].isactive !== false;
    activeChecked.set(userId, { active, at: Date.now() });
    return active;
  } catch (error) {
    // Open, deliberately. The alternative is that a database blip signs every
    // user out of the ERP at once, and these are sessions that were already
    // issued against a verified signature - unlike the login path, where
    // failing open would be an authentication bypass and failing closed only
    // costs someone a retry.
    console.error('Could not check whether the account is still active:', error);
    return true;
  }
}

export async function readSession(request: NextRequest): Promise<SessionInfo | null> {
  const raw = request.cookies.get('tibbna_session')?.value;
  const s = await verifySession<Record<string, string | null>>(raw);
  if (!s) return null;

  // A valid signature says the cookie is ours, not that the account behind it
  // is still allowed in.
  if (s.userId && !(await accountIsActive(s.userId))) return null;

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
