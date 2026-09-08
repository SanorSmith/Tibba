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
  /**
   * What the platform's role catalogue grants this role in this type of
   * facility. Null when the role has no catalogue row - a membership older
   * than the catalogue's coverage of it.
   */
  role_permissions?: string[] | null;
  /**
   * Whether the catalogue says anything at all about ERP access for this type
   * of facility. Until it does, the built-in list decides - see canLogIn.
   */
  type_declares_erp?: boolean | null;
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

/**
 * Which parts of the ERP each module role may open, and where it lands.
 *
 * These two tables were written out three times - in the middleware, and
 * twice in the login page - so a role could be allowed somewhere by one copy
 * and sent somewhere else by another. The handoff from the platform needed
 * them a fourth time, which was the point to stop copying.
 *
 * A landing path must be inside that role's own modules, or arriving anywhere
 * lands on "Access Denied": the handoff sent people to `/`, which only
 * SUPER_ADMIN may open, so a receptionist crossed over successfully and was
 * turned away by the next request.
 */
export const ROLE_MODULES: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  FINANCE_ADMIN: ['/finance'],
  HR_ADMIN: ['/hr', '/staff'],
  INVENTORY_ADMIN: ['/inventory', '/hospital'],
  RECEPTION_ADMIN: ['/reception'],
};

export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/dashboard',
  FINANCE_ADMIN: '/finance',
  HR_ADMIN: '/hr',
  INVENTORY_ADMIN: '/hospital',
  RECEPTION_ADMIN: '/reception',
};

/** Where to put someone whose session has just been created. */
export function landingPathFor(appRole: string): string {
  return ROLE_HOME[appRole] ?? '/dashboard';
}

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

/**
 * The catalogue permission that opens this application.
 *
 * This list above is now the fallback, not the rule. The rule lives in the
 * platform's `workspace_roles` catalogue as `Open ERP` (migration 0088),
 * where the administrator granting a role can see what it grants. Deciding it
 * here meant whoever assigned "accountant" in the admin panel had no way to
 * know they were opening a second application.
 *
 * The fallback still earns its place: a role with no catalogue row for its
 * facility type has no permissions at all, and refusing those outright would
 * lock out anyone whose membership predates the catalogue covering them.
 */
export const OPEN_ERP_PERMISSION = 'Open ERP';

export function canLogIn(
  wsRole: string,
  rolePermissions?: string[] | null,
  typeDeclaresErp?: boolean | null
): boolean {
  // The catalogue governs only once it has something to say. If no active role
  // for this facility type carries `Open ERP`, the permission has not been
  // seeded yet and every membership would read as "may not log in" - locking
  // the whole application out on a deploy that merely arrived before its
  // migration. Deferring to the built-in list until then makes the two
  // orderings equivalent.
  if (typeDeclaresErp && Array.isArray(rolePermissions)) {
    return rolePermissions.includes(OPEN_ERP_PERMISSION);
  }
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
    // Which facilities a user belongs to has to be answerable *before* they
    // are inside one — this query is what decides which one they enter.
    // `workspaceusers` is tenant-scoped, so reading it directly returns
    // nothing under the restricted role, and every sign-in is met with
    // "your account is not assigned to any facility".
    //
    // `app_user_memberships` is a SECURITY DEFINER function that answers for
    // one named user and returns memberships only. The workspace rows are
    // then joined normally, since SELECT on `workspaces` is open by design.
    const m = await pool.query(
      `SELECT mem.workspaceid, w.name AS workspace_name, w.type AS ws_type,
              mem.role AS ws_role, r.permissions AS role_permissions,
              seeded.declared AS type_declares_erp
         FROM public.app_user_memberships($1) AS mem
         JOIN workspaces w ON w.workspaceid = mem.workspaceid
         LEFT JOIN workspace_roles r
                ON r.workspacetype = w.type
               AND r.name = mem.role
               AND r.isactive
         LEFT JOIN LATERAL (
           SELECT bool_or(r2.permissions @> '["Open ERP"]'::jsonb) AS declared
             FROM workspace_roles r2
            WHERE r2.workspacetype = w.type AND r2.isactive
         ) seeded ON true
        WHERE w.isactive IS NOT FALSE
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
  const memberships = allMemberships.filter((x) =>
    canLogIn(x.ws_role, x.role_permissions, x.type_declares_erp)
  );
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

/**
 * The session cookie, scoped to whatever host is actually serving.
 *
 * On a tibbna.com host the cookie is set for `.tibbna.com`, so one session
 * covers erp.tibbna.com alongside anything else the platform serves there
 * rather than each host holding its own.
 *
 * Everywhere else it stays host-only, and that is not a detail: a browser
 * rejects a Domain attribute that is not a parent of the current host, and it
 * rejects it silently. Setting `.tibbna.com` unconditionally would mean no
 * cookie at all on tibbna-erp.vercel.app, on preview deployments and on
 * localhost - sign-in would appear to succeed and land straight back at the
 * login page, with nothing in any log to say why.
 */
export function sessionCookieOptions(host: string | null | undefined) {
  const hostname = (host ?? '').split(':')[0].toLowerCase();
  const onPlatformDomain =
    hostname === 'tibbna.com' || hostname.endsWith('.tibbna.com');

  return onPlatformDomain
    ? { ...SESSION_COOKIE_OPTIONS, domain: '.tibbna.com' }
    : { ...SESSION_COOKIE_OPTIONS };
}

/**
 * The same options with the lifetime removed, for signing out.
 *
 * A cookie is only replaced by one with a matching name, path *and* domain.
 * Clearing without the domain leaves a `.tibbna.com` cookie sitting in the
 * browser, so the user appears signed out and is signed back in on the next
 * request - which is why this exists rather than each caller passing maxAge 0.
 */
export function clearSessionCookieOptions(host: string | null | undefined) {
  return { ...sessionCookieOptions(host), maxAge: 0 };
}
