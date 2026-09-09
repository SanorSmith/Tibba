/**
 * Removes the seeded demo rows that made the HR dashboard disagree with the
 * Staff Directory.
 *
 * The dashboard used to count `employees`, which held ten fabricated records
 * numbered EMP-2024-001 to EMP-2024-010, all created on 6 March 2026 and all
 * filed as active medical staff. The directory counts `staff`, the real
 * roster. The dashboard has been repointed at `staff`; this clears the demo
 * data behind it so nothing is left half-connected.
 *
 * Deliberately conservative. Of the eighteen leave requests, twelve do not
 * resolve to any employee record, but they are not all demo: several belong
 * to real people whose employment records were removed separately. Only the
 * six tied to the seeded employees and one obvious test row are deleted here.
 * The rest are left in place and listed at the end for a human to judge.
 *
 * Writes a JSON backup of everything it touches before deleting, then runs
 * the deletions in one transaction. Pass --confirm to actually delete;
 * without it the script reports what it would do and stops.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const CONFIRM = process.argv.includes('--confirm');

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('No .env.local found in ' + process.cwd());
  process.exit(1);
}
const url = fs
  .readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  ?.slice('DATABASE_URL='.length)
  .replace(/^["']|["']$/g, '');

if (!url) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

// The pooled application role cannot see across facilities and cannot delete
// under row-level security. Migration 0082 made it the session default even
// when connecting as the owner, so the role has to be reclaimed explicitly.
try {
  await client.query('SET ROLE neondb_owner');
} catch {
  console.error('Could not assume neondb_owner. This connection cannot perform the cleanup.');
  process.exit(1);
}

const SEED_IDS = `SELECT id FROM employees WHERE employee_id LIKE 'EMP-2024-%'`;

const targets = [
  ['employees', `SELECT * FROM employees WHERE employee_id LIKE 'EMP-2024-%'`],
  ['leave_requests', `SELECT * FROM leave_requests WHERE employee_id IN (${SEED_IDS}) OR employee_name = 'user999999 test99999999'`],
  ['job_vacancies', `SELECT * FROM job_vacancies WHERE position = 'Integration Test - Pharmacist'`],
  ['daily_attendance', `SELECT * FROM daily_attendance WHERE employee_name IS NULL`],
];

const backup = {};
console.log('\nRows to remove:');
for (const [name, sql] of targets) {
  backup[name] = (await client.query(sql)).rows;
  console.log('  ' + String(backup[name].length).padStart(3) + '  ' + name);
}

// Into an ignored directory, not the repo root: the backup carries real
// names, phone numbers and salaries, and an untracked JSON sitting next to
// package.json is one `git add .` away from being published.
const backupDir = path.join(process.cwd(), '.hr-backups');
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `demo-rows-${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log('\nBackup written to ' + backupPath);

if (!CONFIRM) {
  console.log('\nNothing deleted. Re-run with --confirm to apply.');
  await client.end();
  process.exit(0);
}

await client.query('BEGIN');
try {
  // Leave and attendance rows go first: they reference the employees below,
  // and the point is to remove the fabricated people together with the
  // fabricated history hanging off them.
  const steps = [
    ['leave requests tied to seeded employees', `DELETE FROM leave_requests WHERE employee_id IN (${SEED_IDS})`],
    ['leave request for the test account', `DELETE FROM leave_requests WHERE employee_name = 'user999999 test99999999'`],
    ['nameless seeded attendance rows', `DELETE FROM daily_attendance WHERE employee_name IS NULL`],
    ['the integration-test vacancy', `DELETE FROM job_vacancies WHERE position = 'Integration Test - Pharmacist'`],
    ['seeded employee records', `DELETE FROM employees WHERE employee_id LIKE 'EMP-2024-%'`],
  ];
  console.log('');
  for (const [label, sql] of steps) {
    const r = await client.query(sql);
    console.log('  removed ' + String(r.rowCount).padStart(3) + '  ' + label);
  }
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  console.error('\nRolled back, nothing was deleted: ' + e.message);
  await client.end();
  process.exit(1);
}

const after = await client.query(`
  SELECT (SELECT count(*) FROM employees)                       AS employees_left,
         (SELECT count(*) FROM leave_requests)                  AS leave_requests_left,
         (SELECT count(*) FROM daily_attendance)                AS attendance_left,
         (SELECT count(*) FROM job_vacancies WHERE status='OPEN') AS open_vacancies`);
console.log('\nAfter:');
console.table(after.rows);

// Left in place on purpose. These reference no employee record, but the names
// are of real people, so removing them is a judgement call rather than a
// cleanup. Listed here so the decision is made deliberately.
const remaining = await client.query(`
  SELECT employee_name, status, start_date::date AS start_date, end_date::date AS end_date
  FROM leave_requests ORDER BY employee_name, start_date`);
console.log('\nLeave requests left for you to review:');
console.table(remaining.rows);

await client.end();
