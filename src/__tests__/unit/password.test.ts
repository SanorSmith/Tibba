/**
 * Password hashing and verification.
 *
 * Login accepted any string for any account until recently, so these tests
 * pin down the behaviour that replaced it. The format is shared with the
 * Tibbna platform admin panel, so the interop tests below matter as much as
 * the rejection tests: getting the format subtly wrong would lock every
 * existing user out.
 */
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

const scryptAsync = promisify(scrypt);

/**
 * The platform's own implementation, copied from the preview app's
 * lib/db/queries/user.ts. If our code stops agreeing with this, passwords set
 * in the admin panel stop working here.
 */
async function platformHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

const PASSWORD = 'correct horse battery staple';

describe('hashPassword', () => {
  it('produces the platform format: 32 hex chars, colon, 128 hex chars', async () => {
    const stored = await hashPassword(PASSWORD);
    expect(stored).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(stored).toHaveLength(161);
  });

  it('salts, so the same password hashes differently every time', async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);
    expect(a).not.toEqual(b);
  });

  it('never stores the password in the output', async () => {
    const stored = await hashPassword(PASSWORD);
    expect(stored).not.toContain(PASSWORD);
  });
});

describe('verifyPassword', () => {
  it('accepts the correct password', async () => {
    const stored = await hashPassword(PASSWORD);
    await expect(verifyPassword(PASSWORD, stored)).resolves.toEqual({ ok: true });
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword(PASSWORD);
    const result = await verifyPassword('wrong password', stored);
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('is case-sensitive', async () => {
    const stored = await hashPassword(PASSWORD);
    const result = await verifyPassword(PASSWORD.toUpperCase(), stored);
    expect(result.ok).toBe(false);
  });

  it('rejects a near-miss differing by one character', async () => {
    const stored = await hashPassword(PASSWORD);
    const result = await verifyPassword(PASSWORD + '!', stored);
    expect(result.ok).toBe(false);
  });

  // The reason an account cannot sign in matters operationally: "never had a
  // password" needs an administrator, "wrong password" does not.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ])('reports no-password-set for a %s stored value', async (_label, stored) => {
    const result = await verifyPassword(PASSWORD, stored as string | null | undefined);
    expect(result).toEqual({ ok: false, reason: 'no-password-set' });
  });

  it.each([
    ['bcrypt', '$2b$10$' + 'x'.repeat(53)],
    ['plaintext', 'hunter2'],
    ['hex without a salt separator', 'a'.repeat(160)],
    ['truncated hash', 'a'.repeat(32) + ':' + 'b'.repeat(64)],
    ['non-hex characters', 'z'.repeat(32) + ':' + 'z'.repeat(128)],
  ])('reports unsupported-format for %s', async (_label, stored) => {
    const result = await verifyPassword(PASSWORD, stored);
    expect(result).toEqual({ ok: false, reason: 'unsupported-format' });
  });

  it('does not throw on a corrupt stored value', async () => {
    // timingSafeEqual throws on length mismatch; a bad row must not 500 login.
    await expect(verifyPassword(PASSWORD, ':::')).resolves.toMatchObject({ ok: false });
    await expect(verifyPassword(PASSWORD, 'a:b:c')).resolves.toMatchObject({ ok: false });
  });

  it('rejects an empty password against a real hash', async () => {
    const stored = await hashPassword(PASSWORD);
    const result = await verifyPassword('', stored);
    expect(result.ok).toBe(false);
  });
});

describe('interoperability with the platform admin panel', () => {
  it('verifies a hash the platform produced', async () => {
    const stored = await platformHash(PASSWORD);
    await expect(verifyPassword(PASSWORD, stored)).resolves.toEqual({ ok: true });
  });

  it('produces a hash the platform can verify', async () => {
    const stored = await hashPassword(PASSWORD);
    const [salt, hash] = stored.split(':');
    const buf = (await scryptAsync(PASSWORD, salt, 64)) as Buffer;
    expect(buf.toString('hex')).toEqual(hash);
  });

  it('passes the salt to scrypt as the hex string, not decoded bytes', async () => {
    // This is a quirk of the platform's implementation. Hashing with the
    // decoded salt would produce a different digest and break every existing
    // password, so it is worth pinning explicitly.
    const stored = await hashPassword(PASSWORD);
    const [salt, hash] = stored.split(':');

    const asHexString = ((await scryptAsync(PASSWORD, salt, 64)) as Buffer).toString('hex');
    const asRawBytes = (
      (await scryptAsync(PASSWORD, Buffer.from(salt, 'hex'), 64)) as Buffer
    ).toString('hex');

    expect(asHexString).toEqual(hash);
    expect(asRawBytes).not.toEqual(hash);
  });
});
