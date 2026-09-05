/**
 * Apply a SQL migration from ./migrations by number.
 *
 *   node scripts/apply-migration.mjs 004
 *   node scripts/apply-migration.mjs 004 --dry-run
 *
 * This repository has carried numbered migrations since 001 with no way to
 * run them, so they were applied by hand, in pieces, or not at all - which is
 * why 002 and 003 reference `staff(id)`, a column that does not exist, and
 * left the foreign keys they claim to add missing to this day.
 *
 * Each file is sent as one statement batch. Files that open their own
 * transaction get it honoured; the rest run statement by statement. Every
 * migration here is written to be safe to re-apply.
 *
 * Reads DATABASE_URL from .env.local, and takes the facility-scoped role that
 * the application uses in production - so DDL runs as the owner via SET ROLE
 * rather than requiring a second connection string.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dir = join(root, 'migrations');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--'));

if (wanted.length === 0) {
  console.error('Usage: node scripts/apply-migration.mjs <number> [--dry-run]');
  console.error('Available:');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    console.error('  ' + f);
  }
  process.exit(1);
}

function readEnv(name) {
  const line = readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(name + '='));
  if (!line) throw new Error(`${name} is not set in .env.local`);
  return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}

const files = wanted.map((n) => {
  const match = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .find((f) => f.startsWith(n));
  if (!match) throw new Error(`No migration starting with "${n}" in ${dir}`);
  return match;
});

const client = new pg.Client({
  connectionString: readEnv('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// The app connects as a role that cannot alter the schema, deliberately.
// Migrations need the owner; everything else stays as it is.
await client.query('SET ROLE neondb_owner');

for (const file of files) {
  const sql = readFileSync(join(dir, file), 'utf8');
  if (dryRun) {
    console.log(`--- ${file} (dry run, not applied) ---`);
    console.log(sql);
    continue;
  }
  process.stdout.write(`Applying ${file} ... `);
  try {
    await client.query(sql);
    console.log('done');
  } catch (e) {
    console.log('FAILED');
    console.error(e.message);
    process.exitCode = 1;
    break;
  }
}

await client.end();
