/**
 * Export every composition held in EHRbase to local files.
 *
 * The Postgres backup does not contain any of this. Postgres holds the
 * records that *point at* clinical documents — patients, orders, the
 * composition_ownership map — while the documents themselves live in
 * EHRbase, on a different server. A backup of one without the other restores
 * references to things that are not there.
 *
 * Compositions are written in EHRbase's canonical JSON, one file each, keyed
 * by composition uid and grouped by EHR. A manifest records what was found
 * and what came back, so a partial export is visible as partial rather than
 * passing for complete.
 *
 * Usage: node scripts/export-ehrbase.mjs [outputDir]
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const BASE = process.env.EHRBASE_URL;
const USER = (process.env.EHRBASE_USER ?? '').trim();
const PASS = (process.env.EHRBASE_PASSWORD ?? '').trim();
const KEY = process.env.EHRBASE_API_KEY ?? '';

if (!BASE || !USER) {
  console.error('EHRBASE_URL and EHRBASE_USER must be set.');
  process.exit(1);
}

const headers = {
  Authorization: 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64'),
  'X-API-Key': KEY,
  Accept: 'application/json',
};

const outDir = process.argv[2] ?? join('..', 'db-backups', `ehrbase-${stamp()}`);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function aql(q) {
  const r = await fetch(`${BASE}/ehrbase/rest/openehr/v1/query/aql`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q }),
  });
  if (!r.ok) throw new Error(`AQL ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).rows ?? [];
}

mkdirSync(outDir, { recursive: true });

// One row per composition. Fetching the whole composition through AQL is
// possible, but going via the REST resource gives the canonical document
// exactly as EHRbase would serve it to any other openEHR client — which is
// the form worth keeping.
const rows = await aql(`
  SELECT e/ehr_id/value       as ehr_id,
         c/uid/value          as uid,
         c/archetype_details/template_id/value as template,
         c/context/start_time/value as start_time,
         c/name/value         as name
    FROM EHR e CONTAINS COMPOSITION c`);

console.log(`compositions listed: ${rows.length}`);

const manifest = [];
let ok = 0;
let failed = 0;

for (const [ehrId, uid, template, startTime, name] of rows) {
  // The uid carries a version suffix (::node::1); the resource wants it whole.
  const url = `${BASE}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${encodeURIComponent(uid)}`;
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${r.status}`);
    const body = await r.text();
    const dir = join(outDir, 'ehr', ehrId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${uid.replace(/[:/\\]/g, '_')}.json`), body);
    manifest.push({ ehrId, uid, template, startTime, name, bytes: body.length, status: 'ok' });
    ok++;
  } catch (e) {
    manifest.push({ ehrId, uid, template, startTime, name, status: 'FAILED', error: String(e.message) });
    failed++;
  }
  if ((ok + failed) % 25 === 0) console.log(`  ${ok + failed}/${rows.length}`);
}

writeFileSync(join(outDir, 'manifest.json'),
  JSON.stringify({ exportedAt: new Date().toISOString(), source: BASE,
                   listed: rows.length, exported: ok, failed, compositions: manifest }, null, 2));

console.log(`\nexported ${ok} of ${rows.length}${failed ? `, ${failed} FAILED` : ''}`);
console.log(`-> ${outDir}`);
if (failed) process.exitCode = 1;
