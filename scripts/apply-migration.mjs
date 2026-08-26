/**
 * Apply one or more SQL migrations from lib/db/migrations by number.
 *
 *   node scripts/apply-migration.mjs 0077 0078
 *   node scripts/apply-migration.mjs 0077 --dry-run
 *
 * Each file runs inside a single transaction, so a migration either applies
 * completely or not at all. Files are applied in the order given.
 *
 * This does not track which migrations have run — it is a runner, not a
 * migration framework. Every migration in this directory is written to be
 * safe to re-apply (IF NOT EXISTS, DROP POLICY IF EXISTS).
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const DIR = 'lib/db/migrations';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--'));

if (!wanted.length) {
  console.error('usage: node scripts/apply-migration.mjs <number>... [--dry-run]');
  process.exit(1);
}

const all = readdirSync(DIR).filter((f) => f.endsWith('.sql'));
const files = wanted.map((n) => {
  const match = all.filter((f) => f.startsWith(n));
  if (match.length !== 1) {
    console.error(
      match.length
        ? `"${n}" matches several files: ${match.join(', ')}`
        : `no migration starts with "${n}"`,
    );
    process.exit(1);
  }
  return match[0];
});

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

let failed = false;
for (const file of files) {
  const text = readFileSync(join(DIR, file), 'utf8');
  const statements = text.split(';').filter((s) => s.replace(/--[^\n]*/g, '').trim()).length;

  if (dryRun) {
    console.log(`${file}: ${statements} statements, not applied (--dry-run)`);
    continue;
  }

  process.stdout.write(`${file}: applying ${statements} statements ... `);
  try {
    await sql.begin((tx) => tx.unsafe(text));
    console.log('done');
  } catch (error) {
    console.log('FAILED — rolled back');
    console.error(`  ${error.message.split('\n')[0]}`);
    if (error.position) {
      const at = Number(error.position);
      console.error(`  near: ${text.slice(Math.max(0, at - 90), at + 60).replace(/\s+/g, ' ')}`);
    }
    failed = true;
    break;
  }
}

await sql.end();
process.exit(failed ? 1 : 0);
