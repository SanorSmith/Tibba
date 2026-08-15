/**
 * Facility scoping migration — phase 1 (additive, reversible).
 *
 * Adds a nullable `workspaceid` column to every facility-owned table our ERP
 * uses, then labels all existing rows as belonging to Hospital 1 (where the app
 * has pointed since day one).
 *
 * Deliberately additive: no query in the app filters on workspaceid yet, so
 * behaviour is unchanged after this runs. Scoping the reads is phase 2.
 *
 * To reverse:  UPDATE <t> SET workspaceid = NULL;  ALTER TABLE <t> DROP COLUMN workspaceid;
 *
 * Usage:  node migrate-workspace-scoping.js --dry
 *         node migrate-workspace-scoping.js --apply
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Pool } = require('pg');

const HOSPITAL_1 = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';
const APPLY = process.argv.includes('--apply');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const tables = JSON.parse(fs.readFileSync('to-scope.json', 'utf8'));
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${tables.length} tables -> Hospital 1\n`);

  let added = 0, filled = 0, skipped = 0, failed = [];

  for (const t of tables) {
    try {
      const has = (await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 AND column_name='workspaceid'`,
        [t]
      )).rowCount > 0;

      const rows = parseInt((await pool.query(`SELECT COUNT(*) c FROM "${t}"`)).rows[0].c);

      if (has) {
        skipped++;
        console.log(`  = ${t.padEnd(32)} already has workspaceid`);
        continue;
      }

      if (!APPLY) {
        console.log(`  + ${t.padEnd(32)} would add column, label ${rows} rows`);
        added++; filled += rows;
        continue;
      }

      await pool.query(`ALTER TABLE "${t}" ADD COLUMN workspaceid UUID`);
      const r = await pool.query(
        `UPDATE "${t}" SET workspaceid = $1 WHERE workspaceid IS NULL`, [HOSPITAL_1]
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS "${t}_workspaceid_idx" ON "${t}" (workspaceid)`
      );
      added++; filled += r.rowCount;
      console.log(`  + ${t.padEnd(32)} column added, ${r.rowCount} rows labelled`);
    } catch (e) {
      failed.push([t, e.message]);
      console.log(`  ! ${t.padEnd(32)} FAILED: ${e.message}`);
    }
  }

  console.log(`\ntables changed: ${added} | already had it: ${skipped} | rows labelled: ${filled}`);
  if (failed.length) {
    console.log(`FAILURES (${failed.length}):`);
    failed.forEach(([t, m]) => console.log(`  ${t}: ${m}`));
  }
  process.exit(0);
})();
