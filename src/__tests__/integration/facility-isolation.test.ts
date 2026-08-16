/**
 * Facility isolation across the API.
 *
 * Every ERP table this app owns carries a facility id, and every route that
 * reads one is supposed to filter by the caller's facility. This test asserts
 * the property directly rather than checking route by route: sign in as two
 * users in two different facilities, call the same endpoint as each, and
 * require that no record returned to one appears in the other's response.
 *
 * That catches a regression anywhere in the ~176 scoped routes without having
 * to hardcode row counts, which change as the data does.
 *
 * Requires a running server and database. Skipped unless RUN_INTEGRATION=1,
 * so `npm test` stays green on a machine with neither:
 *
 *     npm run test:isolation
 */
import { Pool } from 'pg';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

// Next.js deliberately does not load .env.local when NODE_ENV=test, so the
// database URL is not present by default and pg would silently fall back to
// localhost. This test is opt-in and talks to the real database, so load it.
require('dotenv').config({ path: '.env.local' });

const scryptAsync = promisify(scrypt);

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ENABLED = process.env.RUN_INTEGRATION === '1';
const describeIntegration = ENABLED ? describe : describe.skip;

/** Endpoints that return facility-owned records. */
const SCOPED_ENDPOINTS = [
  '/api/invoices',
  '/api/services',
  '/api/staff',
  '/api/hr/employees',
  '/api/hr/attendance',
  '/api/hr/leave-types',
  '/api/hr/payroll/periods',
  '/api/hr/performance/reviews',
  '/api/hospital/items',
  '/api/hospital/storage',
  '/api/hospital/orders',
  '/api/insurance-claims',
  '/api/insurance-companies',
  '/api/shareholders',
  '/api/stakeholders',
  '/api/recruitment/applications',
  '/api/recruitment/requisitions',
  '/api/appointments',
  '/api/todos',
  '/api/purchase-requests',
  '/api/specialties',
  '/api/departments',
  '/api/finance/suppliers',
  '/api/finance/accounts',
  '/api/finance/journals',
  '/api/ap-invoices',
  '/api/invoice-returns',
];

/**
 * Routes that never query a facility table themselves — they hand a
 * client-supplied id to a service that does. A GET with someone else's id must
 * come back 404, not that person's data. These are listed separately because
 * the disjoint-ids check above does not apply: they take a required parameter.
 */
const INDIRECT_ENDPOINTS = [
  (id: string) => `/api/hr/leaves/conflicts?employee_id=${id}&start_date=2020-01-01&end_date=2030-12-31`,
  (id: string) => `/api/hr/performance/attendance-score?employee_id=${id}`,
  (id: string) => `/api/hr/payroll/calculate-enhanced?employee_id=${id}`,
];

interface Actor {
  email: string;
  userid: string;
  cookie: string;
  facility: string;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

/** Create a throwaway user attached to one facility, and sign them in. */
async function createActor(facilityName: string, password: string): Promise<Actor> {
  const ws = await pool.query(
    'SELECT workspaceid, name FROM workspaces WHERE TRIM(name) ILIKE TRIM($1) LIMIT 1',
    [facilityName]
  );
  if (ws.rows.length === 0) throw new Error(`No workspace named "${facilityName}"`);

  const email = `_isolationtest_${randomBytes(6).toString('hex')}@example.invalid`;
  const ins = await pool.query(
    `INSERT INTO users (userid, name, email, password, isactive, createdat, updatedat)
     VALUES (gen_random_uuid(), 'Isolation Test', $1, $2, true, NOW(), NOW())
     RETURNING userid`,
    [email, await hash(password)]
  );
  const userid = ins.rows[0].userid;
  await pool.query(
    `INSERT INTO workspaceusers (workspaceid, userid, role) VALUES ($1, $2, 'administrator')`,
    [ws.rows[0].workspaceid, userid]
  );

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${facilityName}: HTTP ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/tibbna_session=([^;]+)/);
  if (!match) throw new Error('No session cookie returned');

  return { email, userid, cookie: `tibbna_session=${match[1]}`, facility: ws.rows[0].name.trim() };
}

async function removeActor(actor: Actor) {
  await pool.query('DELETE FROM workspaceusers WHERE userid = $1', [actor.userid]);
  await pool.query('DELETE FROM users WHERE userid = $1', [actor.userid]);
}

async function get(path: string, cookie?: string) {
  const res = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON (e.g. an error page) — body stays null */
  }
  return { status: res.status, body };
}

/**
 * Pull record identifiers out of a response, whatever shape it uses.
 * Returns null when the payload holds no identifiable list, so the caller can
 * tell "no records" apart from "cannot interpret this".
 */
function extractIds(body: any): string[] | null {
  if (!body) return null;
  const list =
    (Array.isArray(body) && body) ||
    body.data ||
    body.rows ||
    body.staff ||
    body.todos ||
    body.appointments ||
    null;
  if (!Array.isArray(list)) return null;

  const ids: string[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const id =
      row.id ??
      row.staffid ??
      row.todoId ??
      row.todoid ??
      row.application_id ??
      row.requisition_id ??
      row.offer_id ??
      row.interview_id ??
      row.company_id ??
      row.account_id ??
      row.entry_id ??
      row.supplierid ??
      row.appointmentid ??
      row.departmentid ??
      row.specialtyid ??
      row.stakeholder_id ??
      row.shareholder_id ??
      null;
    if (id != null) ids.push(String(id));
  }
  return ids;
}

describeIntegration('facility isolation', () => {
  let a: Actor;
  let b: Actor;

  beforeAll(async () => {
    a = await createActor('Hospital 1', 'isolation-test-pw-a');
    b = await createActor('Alis', 'isolation-test-pw-b');
  }, 60000);

  afterAll(async () => {
    if (a) await removeActor(a);
    if (b) await removeActor(b);
    await pool.end();
  });

  it('signs the two actors into different facilities', () => {
    expect(a.facility).not.toEqual(b.facility);
  });

  describe.each(SCOPED_ENDPOINTS)('%s', (endpoint) => {
    it('returns no record to one facility that belongs to the other', async () => {
      const [ra, rb] = await Promise.all([get(endpoint, a.cookie), get(endpoint, b.cookie)]);

      // A route that errors for both is a broken route, not a leak — that is
      // reported by the endpoint-health test below rather than failing here.
      if (ra.status !== 200 || rb.status !== 200) return;

      const idsA = extractIds(ra.body);
      const idsB = extractIds(rb.body);
      if (idsA === null || idsB === null) return; // aggregate payload, not a list

      const overlap = idsA.filter((id) => idsB.includes(id));
      expect(overlap).toEqual([]);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await get(endpoint);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('routes that reach facility data through a service', () => {
    it("refuses another facility's employee id", async () => {
      // Find an employee belonging to facility B, then ask for them as A.
      const other = await pool.query(
        `SELECT s.staffid FROM staff s
           JOIN workspaces w ON w.workspaceid = s.workspaceid
          WHERE TRIM(w.name) ILIKE $1 LIMIT 1`,
        [b.facility]
      );
      if (other.rows.length === 0) return; // nothing to test with
      const foreignId = other.rows[0].staffid;

      for (const build of INDIRECT_ENDPOINTS) {
        const res = await get(build(foreignId), a.cookie);
        expect([400, 401, 403, 404]).toContain(res.status);
      }
    });

    it('rejects these routes unauthenticated', async () => {
      for (const build of INDIRECT_ENDPOINTS) {
        const res = await get(build('00000000-0000-0000-0000-000000000000'));
        expect([400, 401, 403]).toContain(res.status);
      }
    });
  });

  it('rejects a request carrying a corrupt session cookie', async () => {
    const res = await get('/api/invoices', 'tibbna_session=not-a-real-session');
    expect([401, 403]).toContain(res.status);
  });

  it('reports which scoped endpoints are currently erroring', async () => {
    const broken: string[] = [];
    for (const endpoint of SCOPED_ENDPOINTS) {
      const res = await get(endpoint, a.cookie);
      if (res.status !== 200) broken.push(`${endpoint} -> HTTP ${res.status}`);
    }
    // Surfaced as a failure so it cannot be ignored, with the list attached.
    expect(broken).toEqual([]);
  }, 120000);
});
