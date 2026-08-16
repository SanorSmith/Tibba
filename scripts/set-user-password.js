#!/usr/bin/env node
/**
 * Set a user's password.
 *
 * Login now verifies passwords, and any account whose `users.password` is NULL
 * can no longer sign in. Use this to give those accounts a password.
 *
 * Usage:
 *   node scripts/set-user-password.js <email>
 *     ...then type the password when prompted (it is not echoed, and never
 *     appears in your shell history or the process list).
 *
 *   node scripts/set-user-password.js --list
 *     Show which accounts still have no password set.
 *
 * The hash format matches the Tibbna platform admin panel exactly, so a
 * password set here also works there, and vice versa.
 */
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const { randomBytes, scrypt } = require('crypto');
const { promisify } = require('util');
const readline = require('readline');

const scryptAsync = promisify(scrypt);

const connectionString = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL (or OPENEHR_DATABASE_URL) is not set. Check .env.local.');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

/** Read a line from stdin without echoing it back to the terminal. */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(
        new Error(
          'No interactive terminal available. Run this from your own shell so ' +
            'the password can be typed without being recorded.'
        )
      );
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      const s = String(char);
      if (s === '\n' || s === '\r' || s === '') {
        process.stdin.removeListener('data', onData);
      } else {
        // Redraw the prompt without the typed characters.
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    process.stdin.on('data', onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function list() {
  const r = await pool.query(
    `SELECT email, name, isactive, (password IS NULL) AS no_password
       FROM users
      ORDER BY (password IS NULL) DESC, email`
  );
  const missing = r.rows.filter((x) => x.no_password);
  console.log(`${r.rows.length} users, ${missing.length} with no password set\n`);
  for (const row of r.rows) {
    console.log(
      (row.no_password ? '  NO PASSWORD  ' : '  ok           ') +
        (row.email || '(no email)').padEnd(34) +
        (row.isactive === false ? '(inactive)' : '')
    );
  }
  if (missing.length) {
    console.log('\nAccounts marked NO PASSWORD cannot sign in. Set one with:');
    console.log('  node scripts/set-user-password.js <email>');
  }
}

async function setPassword(email) {
  const found = await pool.query(
    'SELECT userid, email, name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (found.rows.length === 0) {
    console.error(`No user found with email "${email}".`);
    console.error('Run with --list to see the accounts that exist.');
    process.exitCode = 1;
    return;
  }
  const user = found.rows[0];

  const password = await promptHidden(`New password for ${user.email}: `);
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters. Nothing was changed.');
    process.exitCode = 1;
    return;
  }
  const confirm = await promptHidden('Confirm password: ');
  if (password !== confirm) {
    console.error('Passwords did not match. Nothing was changed.');
    process.exitCode = 1;
    return;
  }

  const hashed = await hashPassword(password);
  await pool.query('UPDATE users SET password = $1, updatedat = NOW() WHERE userid = $2', [
    hashed,
    user.userid,
  ]);
  console.log(`Password set for ${user.email}.`);
}

(async () => {
  try {
    const arg = process.argv[2];
    if (!arg || arg === '--list' || arg === '-l') {
      await list();
    } else if (arg === '--help' || arg === '-h') {
      console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0]);
    } else {
      await setPassword(arg);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
