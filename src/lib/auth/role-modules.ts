/**
 * Which parts of the application each role may open, and where it lands.
 *
 * This lived in five places: the middleware's own copy, the session endpoint,
 * the Google callback, and twice inside the login page. Three of them carried
 * a comment saying they must be kept in step with the others, which is a
 * comment describing a bug rather than preventing one - the middleware blocks
 * the request while the copies decide what the interface offers, so a drift
 * shows up as a menu item that bounces you to the unauthorized page.
 *
 * One definition, in a file that imports nothing, so a client component can
 * read it as safely as the middleware.
 */

/**
 * Every role reaches the Staff Portal.
 *
 * It used to belong to HR and administrators alone, which meant a doctor could
 * not see their own payslip, book their own leave, or clock in - the portal
 * built for them was the one thing they could not open. Everyone else was sent
 * to /unauthorized.
 *
 * That is also, almost certainly, why a second employee portal exists at
 * /employee: someone hit the wall and started again rather than opening the
 * first one up. It was never wired in either, so there were two portals and
 * nobody could use either.
 *
 * Nothing here needs guarding by role, because the portal is scoped to the
 * person signed in: their attendance, their leave, their payslips, their
 * password. A receptionist opening it sees a receptionist's own record.
 */
const SELF_SERVICE = '/staff';

export const ROLE_MODULES: Record<string, string[]> = {
  SUPER_ADMIN:     ['*'],
  FINANCE_ADMIN:   ['/finance', SELF_SERVICE],
  HR_ADMIN:        ['/hr', SELF_SERVICE],
  INVENTORY_ADMIN: ['/inventory', '/hospital', SELF_SERVICE],
  RECEPTION_ADMIN: ['/reception', SELF_SERVICE],
};

/**
 * Where someone belongs when their session has just been made.
 *
 * Deliberately not the Staff Portal for anyone. Self-service is somewhere you
 * go, not the reason you signed in.
 */
export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN:     '/dashboard',
  FINANCE_ADMIN:   '/finance',
  HR_ADMIN:        '/hr',
  INVENTORY_ADMIN: '/hospital',
  RECEPTION_ADMIN: '/reception',
};

/** Whether a role may open a given path. The one place this is decided. */
export function mayOpen(role: string | null | undefined, pathname: string): boolean {
  const allowed = ROLE_MODULES[role ?? ''] ?? [];
  if (allowed.includes('*')) return true;
  return allowed.some((prefix) => pathname.startsWith(prefix));
}
