/**
 * Who may hand out what, and who may get in at all.
 *
 * These are the rules that decide whether a delegation is a delegation or a
 * hole. None of them had a test before: the ERP had five integration tests and
 * none touched roles, permissions or account creation, so a change to the
 * grant rule would have shipped silently.
 *
 * Everything here is a pure function. No database, no server, no fixtures to
 * clean up, which is the point — the existing integration tests need a live
 * server and write membership rows to whatever database is configured, so they
 * are not something you can run casually against production.
 */
import {
  NEVER_GRANTED_BY_HR,
  ROLE_HOME,
  ROLE_MODULES,
  WS_ROLE_TO_APP_ROLE,
  canLogIn,
  collapseByFacility,
  grantRuleFor,
  landingPathFor,
} from '@/lib/auth/facility-session';

/** Every role a hospital offers, as the catalogue defines it. */
const HOSPITAL_ROLES = [
  'administrator',
  'accountant',
  'doctor',
  'hr_officer',
  'inventory_officer',
  'nurse',
  'pharmacist',
  'plastic_surgeon',
  'receptionist',
];

describe('grantRuleFor', () => {
  it('lets a facility administrator grant every role a hospital has', () => {
    const canGrant = grantRuleFor('SUPER_ADMIN');
    expect(canGrant).not.toBeNull();
    for (const role of HOSPITAL_ROLES) {
      expect(canGrant!(role)).toBe(true);
    }
  });

  it('lets an HR officer grant everything except administrator', () => {
    const canGrant = grantRuleFor('HR_ADMIN');
    expect(canGrant).not.toBeNull();

    for (const role of HOSPITAL_ROLES.filter((r) => r !== 'administrator')) {
      expect(canGrant!(role)).toBe(true);
    }
    expect(canGrant!('administrator')).toBe(false);
  });

  it('refuses account management to everyone else', () => {
    // The route turns null into a 403. A receptionist or a doctor who reaches
    // the accounts endpoint must not be able to hand out anything at all.
    for (const appRole of ['RECEPTION_ADMIN', 'FINANCE_ADMIN', 'INVENTORY_ADMIN']) {
      expect(grantRuleFor(appRole)).toBeNull();
    }
  });

  it('refuses a missing or unrecognised app role', () => {
    // A session with no role, or one carrying something nobody mapped, must
    // fail closed. Failing open here would make every guard below pointless.
    expect(grantRuleFor(null)).toBeNull();
    expect(grantRuleFor(undefined)).toBeNull();
    expect(grantRuleFor('')).toBeNull();
    expect(grantRuleFor('SUPER_ADMIN_BUT_NOT_REALLY')).toBeNull();
  });

  it('names administrator as the role HR may not grant', () => {
    // Stated separately from the behaviour above so that widening the set is a
    // deliberate act with a failing test attached, not a quiet edit.
    expect([...NEVER_GRANTED_BY_HR]).toEqual(['administrator']);
  });

  it('never lets an HR officer promote someone to their own appointer', () => {
    // The whole point of the split: an HR officer who could grant
    // administrator could grant it to themselves, and the two levels would be
    // the same level.
    const hr = grantRuleFor('HR_ADMIN')!;
    const granted = HOSPITAL_ROLES.filter((r) => hr(r));
    expect(granted).not.toContain('administrator');
    expect(granted).toContain('hr_officer');
  });
});

describe('canLogIn', () => {
  it('admits the six roles that carry Open ERP in the catalogue', () => {
    for (const role of [
      'administrator',
      'receptionist',
      'accountant',
      'pharmacist',
      'inventory_officer',
      'hr_officer',
    ]) {
      expect(canLogIn(role, ['Open ERP'], true)).toBe(true);
    }
  });

  it('refuses clinical roles even when the facility type declares the ERP', () => {
    // A doctor, nurse, plastic surgeon or lab technician works through the EHR.
    // Their catalogue rows deliberately lack the permission.
    for (const role of ['doctor', 'nurse', 'plastic_surgeon', 'lab_technician']) {
      expect(canLogIn(role, ['View Patients'], true)).toBe(false);
    }
  });

  it('falls back to the built-in list when the catalogue says nothing', () => {
    // A deploy that lands before its migration leaves every role with no
    // permissions. Reading that as "nobody may log in" would lock the whole
    // application out, so the built-in list governs until the catalogue is
    // seeded.
    expect(canLogIn('administrator', null, false)).toBe(true);
    expect(canLogIn('hr_officer', undefined, null)).toBe(true);
    expect(canLogIn('doctor', null, false)).toBe(false);
  });

  it('trusts the catalogue over the built-in list once it has an answer', () => {
    // The catalogue is the rule and the list is only the fallback. A role the
    // list would admit must still be refused if the catalogue withholds the
    // permission, or the admin panel's checkbox would be advisory.
    expect(canLogIn('receptionist', [], true)).toBe(false);
  });
});

describe('landing paths stay inside their own modules', () => {
  // The bug this pins down: the handoff sent everyone to `/`, which only
  // SUPER_ADMIN may open, so a receptionist crossed over from the EHR
  // successfully and was met with "Access Denied" by the very next request.
  it.each(Object.keys(ROLE_HOME))('lands %s somewhere it is allowed to be', (appRole) => {
    const home = landingPathFor(appRole);
    const modules = ROLE_MODULES[appRole];

    expect(modules).toBeDefined();
    if (modules.includes('*')) return;

    expect(modules.some((m) => home === m || home.startsWith(m + '/'))).toBe(true);
  });

  it('gives every mapped facility role a landing path', () => {
    // A role in WS_ROLE_TO_APP_ROLE with no home would drop that person on the
    // default dashboard, which is the SUPER_ADMIN page.
    for (const appRole of Object.values(WS_ROLE_TO_APP_ROLE)) {
      expect(ROLE_HOME[appRole]).toBeDefined();
    }
  });
});

describe("collapseByFacility", () => {
  const m = (workspaceid: string, ws_role: string) => ({
    workspaceid,
    workspace_name: workspaceid,
    ws_type: 'hospital',
    ws_role,
  });

  it("shows a facility once, however many roles are held there", () => {
    // Without this the picker lists the same hospital two or three times.
    const out = collapseByFacility([m('h1', 'receptionist'), m('h1', 'administrator')]);
    expect(out).toHaveLength(1);
  });

  it("keeps the role that opens the most of this app", () => {
    // Whichever row the database returned first must not decide the session.
    // An administrator who is also a receptionist signs in as the administrator.
    expect(
      collapseByFacility([m('h1', 'receptionist'), m('h1', 'administrator')])[0].ws_role
    ).toBe('administrator');
    expect(
      collapseByFacility([m('h1', 'administrator'), m('h1', 'receptionist')])[0].ws_role
    ).toBe('administrator');
  });

  it("never lets an unrecognised role outrank a real one", () => {
    expect(
      collapseByFacility([m('h1', 'some_future_title'), m('h1', 'accountant')])[0].ws_role
    ).toBe('accountant');
  });

  it("leaves separate facilities separate", () => {
    const out = collapseByFacility([m('h1', 'administrator'), m('h2', 'accountant')]);
    expect(out.map((x) => x.workspaceid)).toEqual(['h1', 'h2']);
  });

  it("preserves the query's hospital-first ordering", () => {
    // The query sorts hospitals first and then by age; collapsing must not
    // reshuffle that or the default facility changes.
    const out = collapseByFacility([m('h2', 'accountant'), m('h1', 'administrator')]);
    expect(out.map((x) => x.workspaceid)).toEqual(['h2', 'h1']);
  });
});

/**
 * The same rule, read the way the two link paths read it.
 *
 * Filtering the dropdown was the first attempt and it is not enough: the
 * account id travels in a request body, and a request body can be written by
 * hand. Both the picker and the save now ask `grantRuleFor` the same question
 * about every role the target account holds in this facility, so these cases
 * describe what each of them must decide.
 */
describe('linking an existing account to a staff record', () => {
  /** What the routes compute: may this manager attach that account? */
  const mayLink = (managerRole: string | undefined, heldByTarget: string[]) => {
    const canGrant = grantRuleFor(managerRole);
    if (!canGrant) return false;
    // No role here means no business here, whoever is asking.
    if (heldByTarget.length === 0) return false;
    return heldByTarget.every((r) => canGrant(r));
  };

  it('refuses an HR officer the account of an administrator', () => {
    expect(mayLink('HR_ADMIN', ['administrator'])).toBe(false);
  });

  it('refuses it even when the administrator role is one of several', () => {
    // The dangerous role hidden among ordinary ones is the case a naive
    // "does it hold any role I can grant" check would wave through.
    expect(mayLink('HR_ADMIN', ['receptionist', 'administrator'])).toBe(false);
  });

  it('lets an HR officer link the accounts they do manage', () => {
    expect(mayLink('HR_ADMIN', ['receptionist'])).toBe(true);
    expect(mayLink('HR_ADMIN', ['accountant', 'pharmacist'])).toBe(true);
  });

  it('lets an administrator link anyone in the facility, administrators included', () => {
    expect(mayLink('SUPER_ADMIN', ['administrator'])).toBe(true);
  });

  it('refuses an account that holds no role in this facility', () => {
    // A platform administrator with no membership here is the live example:
    // real account, real permissions, and nothing to do with this hospital
    // until someone assigns it.
    expect(mayLink('SUPER_ADMIN', [])).toBe(false);
    expect(mayLink('HR_ADMIN', [])).toBe(false);
  });

  it('refuses everyone who cannot manage accounts at all', () => {
    expect(mayLink('RECEPTION_ADMIN', ['receptionist'])).toBe(false);
    expect(mayLink(undefined, ['receptionist'])).toBe(false);
  });
});
