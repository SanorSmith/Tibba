/**
 * Who may open what.
 *
 * This map decided, for a long time, that only HR and administrators could
 * reach the Staff Portal - so a doctor could not see their own payslip, book
 * their own leave, or clock in. The portal built for them was the one thing
 * they could not open, and everyone else was sent to /unauthorized.
 *
 * It also existed in five copies: the middleware's, the session endpoint's,
 * the Google callback's, and twice inside the login page. Three of them
 * carried a comment saying they must be kept in step, which describes the bug
 * rather than preventing it. A drift shows up as a menu item that bounces the
 * person who clicks it.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ROLE_MODULES, ROLE_HOME, mayOpen } from '@/lib/auth/role-modules';

const SRC = join(process.cwd(), 'src');

function filesUnder(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) filesUnder(full, found);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) found.push(full);
  }
  return found;
}

describe('role access', () => {
  const roles = Object.keys(ROLE_MODULES);

  it('covers every role the session can carry', () => {
    expect(roles).toEqual(
      expect.arrayContaining([
        'SUPER_ADMIN',
        'FINANCE_ADMIN',
        'HR_ADMIN',
        'INVENTORY_ADMIN',
        'RECEPTION_ADMIN',
      ]),
    );
  });

  it('lets everyone reach their own payslip, leave and clock', () => {
    // Nothing here needs guarding by role: the portal is scoped to the person
    // signed in. A receptionist opening it sees a receptionist's own record.
    for (const role of roles) {
      expect(mayOpen(role, '/staff')).toBe(true);
      expect(mayOpen(role, '/staff/payslips')).toBe(true);
    }
  });

  it('still keeps each role out of the modules that are not theirs', () => {
    // Opening up self-service must not have opened up anything else.
    expect(mayOpen('RECEPTION_ADMIN', '/finance')).toBe(false);
    expect(mayOpen('RECEPTION_ADMIN', '/hr')).toBe(false);
    expect(mayOpen('FINANCE_ADMIN', '/hr')).toBe(false);
    expect(mayOpen('FINANCE_ADMIN', '/reception')).toBe(false);
    expect(mayOpen('INVENTORY_ADMIN', '/finance')).toBe(false);
    expect(mayOpen('HR_ADMIN', '/finance')).toBe(false);
  });

  it('gives an administrator everything and an unknown role nothing', () => {
    expect(mayOpen('SUPER_ADMIN', '/anything/at/all')).toBe(true);
    expect(mayOpen('NOT_A_ROLE', '/reception')).toBe(false);
    expect(mayOpen(null, '/staff')).toBe(false);
    expect(mayOpen(undefined, '/staff')).toBe(false);
  });

  it('sends every role somewhere it may actually open', () => {
    // A landing path outside the role's own modules means signing in and being
    // bounced straight to /unauthorized, which reads as a failed sign-in.
    for (const role of roles) {
      expect(mayOpen(role, ROLE_HOME[role])).toBe(true);
    }
  });

  it('is defined once', () => {
    // Five copies is how the map and the middleware came to disagree.
    const offenders = filesUnder(SRC)
      .filter((f) => !f.endsWith(join('auth', 'role-modules.ts')))
      .filter((f) => /const\s+ROLE_MODULES\s*[:=]/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(process.cwd(), '').replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});
