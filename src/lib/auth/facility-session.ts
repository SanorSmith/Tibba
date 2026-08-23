/**
 * Resolving which facility a signed-in user opens, and building the session.
 *
 * Shared by the password login and Google sign-in so the two cannot drift
 * apart. Proving *who* you are differs between them; deciding *what you can
 * see* must not.
 */
import type { Pool } from 'pg';
import { signSession } from './session-token';

export interface DbUser {
  userid: string;
  name: string | null;
  email: string | null;
}

export interface Membership {
  workspaceid: string;
  workspace_name: string;
  ws_type: string;
  ws_role: string;
}

export interface Facility {
  workspaceId: string;
  name: string;
  type: string;
  role: string;
}

export type FacilityResolution =
  | { kind: 'resolved'; membership: Membership }
  | { kind: 'choose'; facilities: Facility[] }
  | { kind: 'error'; status: number; error: string };

/**
 * Map the platform's facility role onto this app's module-access roles.
 * Clinical roles get reception (patients/appointments/billing); admins get
 * everything; pharmacists additionally need inventory.
 */
export const WS_ROLE_TO_APP_ROLE: Record<string, string> = {
  administrator: 'SUPER_ADMIN',
  // Clinical roles are reception-facing only. A doctor or nurse with no
  // other facility role must not reach Inventory — they book, register and
  // bill patients, they do not manage stock.
  doctor: 'RECEPTION_ADMIN',
  nurse: 'RECEPTION_ADMIN',
  receptionist: 'RECEPTION_ADMIN',
  plastic_surgeon: 'RECEPTION_ADMIN',
  lab_technician: 'RECEPTION_ADMIN',
  pharmacist: 'INVENTORY_ADMIN',
  // Added so Finance, HR and Inventory each have their own facility role
  // rather than only being reachable through the disabled-by-default demo
  // logins or the pharmacist title.
  accountant: 'FINANCE_ADMIN',
  hr_officer: 'HR_ADMIN',
  inventory_officer: 'INVENTORY_ADMIN',
};

export function appRoleFor(membership: Membership): string {
  return WS_ROLE_TO_APP_ROLE[membership.ws_role] ?? 'RECEPTION_ADMIN';
}

/**
 * Facility roles allowed to sign in to this ERP at all. Pure clinical roles
 * (doctor, nurse, plastic_surgeon, lab_technician) work through the separate
 * EHR/care app, not this one — a membership that is only one of those roles
 * must not reach any module here, not even Reception.
 */
const LOGIN_ALLOWED_ROLES = new Set([
  'administrator',
  'receptionist',
  'accountant',
  'pharmacist',
  'inventory_officer',
  'hr_officer',
]);

export function canLogIn(wsRole: string): boolean {
  return LOGIN_ALLOWED_ROLES.has(wsRole);
}

/**
 * Which facility should this user open?
 *
 * Ordering when they belong to several: this app is the hospital ERP, so
 * hospitals sort first, then earliest-created — that keeps existing staff in
 * the facility they have always used rather than whichever was created most
 * recently.
 */
export async function resolveFacility(
  pool: Pool,
  userid: string,
  chosenWorkspaceId?: string | null
): Promise<FacilityResolution> {
  let allMemberships: Membership[];
  try {
    const m = await pool.query(
      `SELECT wu.workspaceid, w.name AS workspace_name, w.type AS ws_type, wu.role AS ws_role
         FROM workspaceusers wu
         JOIN workspaces w ON w.workspaceid = wu.workspaceid
        WHERE wu.userid = $1 AND w.isactive IS NOT FALSE
        ORDER BY (w.type = 'hospital') DESC, w.createdat ASC`,
      [userid]
    );
    allMemberships = m.rows;
  } catch (e) {
    // A lookup failure is not the same as "no membership": we cannot tell which
    // facility this user belongs to, so refuse rather than guess.
    console.error('Workspace lookup failed:', e);
    return {
      kind: 'error',
      status: 503,
      error: 'Could not resolve your facility. Please try again.',
    };
  }

  // Clinical-only memberships (doctor, nurse, plastic_surgeon, lab_technician)
  // don't get to open this app — they belong in the separate EHR/care app.
  // A user with several facilities still gets in if at least one of those
  // memberships carries a role this app actually serves.
  const memberships = allMemberships.filter((x) => canLogIn(x.ws_role));
  if (memberships.length === 0 && allMemberships.length > 0) {
    return {
      kind: 'error',
      status: 403,
      error: 'Your role does not have access to this application.',
    };
  }

  if (chosenWorkspaceId) {
    const picked = memberships.find((x) => x.workspaceid === chosenWorkspaceId);
    if (!picked) {
      return { kind: 'error', status: 403, error: 'You do not have access to that facility' };
    }
    return { kind: 'resolved', membership: picked };
  }

  if (memberships.length > 1) {
    return {
      kind: 'choose',
      facilities: memberships.map((x) => ({
        workspaceId: x.workspaceid,
        name: x.workspace_name.trim(),
        type: x.ws_type,
        role: x.ws_role,
      })),
    };
  }

  if (memberships.length === 1) {
    return { kind: 'resolved', membership: memberships[0] };
  }

  return {
    kind: 'error',
    status: 403,
    error:
      'Your account is not assigned to any facility. Ask an administrator to grant you access.',
  };
}

/** The payload stored in the `tibbna_session` cookie. */
export function buildSession(dbUser: DbUser, membership: Membership, username?: string) {
  return {
    username: username ?? dbUser.email ?? dbUser.userid,
    role: appRoleFor(membership),
    timestamp: Date.now(),
    userId: dbUser.userid,
    workspaceId: membership.workspaceid,
    workspaceName: membership.workspace_name,
    facilityRole: membership.ws_role,
    email: dbUser.email,
  };
}

/**
 * Signs the session. Was a bare base64 encode, which anyone could reproduce —
 * see `session-token.ts` for what that allowed.
 */
export function encodeSession(session: object): Promise<string> {
  return signSession(session);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60, // 8 hours
  path: '/',
};
