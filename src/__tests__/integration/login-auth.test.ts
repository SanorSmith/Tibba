/**
 * Login authentication.
 *
 * The login route used to issue a session for any password, so these tests
 * exist to make sure that cannot come back. They exercise the real route
 * against the real database using a throwaway account.
 *
 * Requires a running server and database. Skipped unless RUN_INTEGRATION=1:
 *
 *     npm run test:isolation
 */
import { Pool } from 'pg';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

require('dotenv').config({ path: '.env.local' });

const scryptAsync = promisify(scrypt);

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const describeIntegration = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PASSWORD = 'a-real-password-' + randomBytes(4).toString('hex');
const EMAIL = `_authtest_${randomBytes(6).toString('hex')}@example.invalid`;
const NO_PASSWORD_EMAIL = `_authtest_np_${randomBytes(6).toString('hex')}@example.invalid`;

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

async function login(username: string, password: unknown) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body, setCookie: res.headers.get('set-cookie') };
}

async function createUser(email: string, password: string | null) {
  const ws = await pool.query(
    "SELECT workspaceid FROM workspaces WHERE TRIM(name) ILIKE 'Hospital 1' LIMIT 1"
  );
  const ins = await pool.query(
    `INSERT INTO users (userid, name, email, password, isactive, createdat, updatedat)
     VALUES (gen_random_uuid(), 'Auth Test', $1, $2, true, NOW(), NOW())
     RETURNING userid`,
    [email, password === null ? null : await hash(password)]
  );
  const userid = ins.rows[0].userid;
  await pool.query(
    `INSERT INTO workspaceusers (workspaceid, userid, role) VALUES ($1, $2, 'administrator')`,
    [ws.rows[0].workspaceid, userid]
  );
  return userid;
}

describeIntegration('login authentication', () => {
  const created: string[] = [];

  beforeAll(async () => {
    created.push(await createUser(EMAIL, PASSWORD));
    created.push(await createUser(NO_PASSWORD_EMAIL, null));
  }, 60000);

  afterAll(async () => {
    for (const userid of created) {
      await pool.query('DELETE FROM workspaceusers WHERE userid = $1', [userid]);
      await pool.query('DELETE FROM users WHERE userid = $1', [userid]);
    }
    await pool.end();
  });

  it('accepts the correct password and issues a session', async () => {
    const res = await login(EMAIL, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.setCookie).toContain('tibbna_session=');
  });

  it('rejects a wrong password', async () => {
    const res = await login(EMAIL, PASSWORD + 'x');
    expect(res.status).toBe(401);
    expect(res.setCookie).toBeNull();
  });

  it('rejects a password differing only in case', async () => {
    const res = await login(EMAIL, PASSWORD.toUpperCase());
    expect(res.status).toBe(401);
  });

  it('rejects an empty password', async () => {
    const res = await login(EMAIL, '');
    expect([400, 401]).toContain(res.status);
  });

  it('rejects an unknown account', async () => {
    const res = await login('_nobody_@example.invalid', 'anything');
    expect(res.status).toBe(401);
  });

  it('refuses an account that has no password set', async () => {
    // 13 real accounts are in this state. They must not be loginable, and the
    // message has to say what to do about it.
    const res = await login(NO_PASSWORD_EMAIL, 'anything');
    expect(res.status).toBe(403);
    expect(String(res.body?.error)).toMatch(/no password set/i);
  });

  it('gives the same message for a wrong password and an unknown account', async () => {
    // Otherwise login can be used to discover which accounts exist.
    const wrong = await login(EMAIL, 'not-the-password');
    const unknown = await login('_also_nobody_@example.invalid', 'not-the-password');
    expect(wrong.status).toBe(unknown.status);
    expect(wrong.body?.error).toEqual(unknown.body?.error);
  });

  it('does not echo the password back in the response', async () => {
    const res = await login(EMAIL, PASSWORD);
    expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
  });

  it('does not accept a non-string password', async () => {
    for (const value of [null, undefined, 123, true, { toString: () => PASSWORD }, [PASSWORD]]) {
      const res = await login(EMAIL, value);
      expect(res.status).not.toBe(200);
    }
  });

  it('rejects the legacy demo logins while DEMO_LOGIN_PASSWORD is unset', async () => {
    for (const name of ['superadmin', 'finance', 'hr', 'inventory', 'reception']) {
      const res = await login(name, 'anything');
      expect(res.status).toBe(401);
    }
  });

  it('scopes the issued session to the user’s facility', async () => {
    const res = await login(EMAIL, PASSWORD);
    expect(res.body?.user?.workspaceName?.trim()).toBe('Hospital 1');
  });
});
