/**
 * Print a scrypt hash for a password, in the exact format users.password
 * expects: 32 hex chars of salt, a colon, then 128 hex chars of hash.
 *
 * Passwords stored as plaintext can never sign in — verifyPassword rejects
 * anything that is not this shape, which is why a "correct" password read
 * straight out of the column does not work.
 *
 * The password is read from stdin rather than an argument, so it does not end
 * up in your shell history or in the process list where other users on the
 * machine could see it.
 *
 *   echo -n 'the-password' | node scripts/hash-password.mjs
 *
 * Then paste the printed value into the table:
 *
 *   UPDATE users SET password = '<printed value>'
 *    WHERE LOWER(email) = LOWER('someone@example.com');
 */
import { randomBytes, scryptSync } from 'node:crypto';

const KEY_LEN = 64;      // 64 bytes -> 128 hex chars
const SALT_BYTES = 16;   // 16 bytes -> 32 hex chars

const password = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => resolve(data.replace(/\r?\n$/, '')));
  process.stdin.on('error', reject);
});

if (!password) {
  console.error('No password on stdin.  Usage:  echo -n \'the-password\' | node scripts/hash-password.mjs');
  process.exit(1);
}

// The salt is fed to scrypt as its hex *string*, not the decoded bytes —
// matching src/lib/auth/password.ts. Hashing it the other way produces a value
// the app will silently reject.
const salt = randomBytes(SALT_BYTES).toString('hex');
const hash = scryptSync(password, salt, KEY_LEN).toString('hex');

console.log(`${salt}:${hash}`);
