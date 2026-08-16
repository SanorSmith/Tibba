/**
 * Password hashing and verification.
 *
 * The format is dictated by the platform admin panel, which is what actually
 * creates user accounts (see the preview app's lib/db/queries/user.ts):
 *
 *     salt = randomBytes(16).toString('hex')        // 32 hex chars
 *     hash = scrypt(password, salt, 64).toString('hex')  // 128 hex chars
 *     stored = `${salt}:${hash}`                    // 161 chars total
 *
 * The salt is passed to scrypt as the hex *string*, not the decoded bytes.
 * That is a quirk of the original implementation, but it has to be matched
 * exactly or every existing password stops verifying.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const KEY_LEN = 64;
const SALT_BYTES = 16;

/** A stored value that looks like our scrypt format: 32 hex, colon, 128 hex. */
const SCRYPT_FORMAT = /^[a-f0-9]{32}:[a-f0-9]{128}$/i;

/** bcrypt, which the platform's unused chat-template helper can produce. */
const BCRYPT_FORMAT = /^\$2[aby]\$\d{2}\$/;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'no-password-set' | 'mismatch' | 'unsupported-format' };

/**
 * Hash a password in the same format the platform writes, so a password set
 * here still works in the admin panel and vice versa.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const buf = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

/**
 * Verify a password against a stored value.
 *
 * Returns a reason rather than throwing, so the caller can distinguish
 * "this account has no password yet" from "wrong password" for logging while
 * still showing the user the same generic message.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<VerifyResult> {
  if (!stored) return { ok: false, reason: 'no-password-set' };

  if (BCRYPT_FORMAT.test(stored)) {
    // No bcrypt dependency in this app, and no account currently uses it.
    // Fail loudly-but-safely rather than silently rejecting a correct
    // password, which would be very hard to diagnose.
    return { ok: false, reason: 'unsupported-format' };
  }

  if (!SCRYPT_FORMAT.test(stored)) {
    return { ok: false, reason: 'unsupported-format' };
  }

  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;

  // timingSafeEqual throws on a length mismatch, which the format check above
  // already rules out — but a corrupt row should not 500 the login route.
  if (expected.length !== actual.length) return { ok: false, reason: 'mismatch' };

  return timingSafeEqual(expected, actual)
    ? { ok: true }
    : { ok: false, reason: 'mismatch' };
}
