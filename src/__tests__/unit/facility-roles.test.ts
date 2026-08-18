/**
 * Facility role -> module access.
 *
 * This mapping used to exist twice — once in the password login route, once
 * in the Google sign-in path — and had already drifted apart once. It is now
 * a single table (src/lib/auth/facility-session.ts) that both paths import,
 * so these tests are the one place that needs updating when a role changes,
 * and both sign-in methods inherit it automatically.
 */
import { WS_ROLE_TO_APP_ROLE, appRoleFor, type Membership } from '@/lib/auth/facility-session';

function membershipWithRole(ws_role: string): Membership {
  return { workspaceid: 'ws-1', workspace_name: 'Test Hospital', ws_type: 'hospital', ws_role };
}

describe('WS_ROLE_TO_APP_ROLE', () => {
  it('gives administrators full access', () => {
    expect(WS_ROLE_TO_APP_ROLE.administrator).toBe('SUPER_ADMIN');
  });

  it.each(['doctor', 'nurse', 'receptionist', 'plastic_surgeon', 'lab_technician'])(
    'restricts the clinical role %s to reception',
    (role) => {
      expect(WS_ROLE_TO_APP_ROLE[role]).toBe('RECEPTION_ADMIN');
    }
  );

  it('gives the accountant role finance access', () => {
    expect(WS_ROLE_TO_APP_ROLE.accountant).toBe('FINANCE_ADMIN');
  });

  it('gives the hr_officer role HR access', () => {
    expect(WS_ROLE_TO_APP_ROLE.hr_officer).toBe('HR_ADMIN');
  });

  it('gives the inventory_officer role inventory access', () => {
    expect(WS_ROLE_TO_APP_ROLE.inventory_officer).toBe('INVENTORY_ADMIN');
  });

  it('keeps the pharmacist role on inventory too', () => {
    // inventory_officer is the generic role added alongside it; pharmacist
    // must keep working exactly as before.
    expect(WS_ROLE_TO_APP_ROLE.pharmacist).toBe('INVENTORY_ADMIN');
  });
});

describe('appRoleFor', () => {
  it('resolves each new role through a full membership object', () => {
    expect(appRoleFor(membershipWithRole('accountant'))).toBe('FINANCE_ADMIN');
    expect(appRoleFor(membershipWithRole('hr_officer'))).toBe('HR_ADMIN');
    expect(appRoleFor(membershipWithRole('inventory_officer'))).toBe('INVENTORY_ADMIN');
  });

  it('falls back to the most restrictive role for an unrecognised facility role', () => {
    // Failing toward RECEPTION_ADMIN rather than SUPER_ADMIN means a typo in
    // workspaceusers.role can only under-grant access, never over-grant it.
    expect(appRoleFor(membershipWithRole('some_future_title_nobody_mapped_yet'))).toBe(
      'RECEPTION_ADMIN'
    );
  });
});
