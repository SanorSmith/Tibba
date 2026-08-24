/**
 * Give the compositions that already exist an owner.
 *
 * From migration 0072 onward every new composition records the facility it
 * belongs to. The ones written before that do not, and an empty row is not
 * the same as an absent one: `ownedCompositionUids` treats "nothing recorded"
 * as "fall back to the old text filter", so until these are backfilled the
 * lab view still depends on matching `LabWorkspaceId:` inside prose.
 *
 * Ownership is derived from two things, in order:
 *   1. `LabWorkspaceId: <uuid>` in the service request description — the
 *      routing a clinician actually chose, and the strongest signal available.
 *   2. the patient's own facility, matched by ehr_id, for everything else.
 *
 * A composition that yields neither is left alone and reported. Guessing an
 * owner for a clinical document is worse than leaving it to the fallback.
 *
 * Run with --apply to write; without it, reports what it would do.
 */
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const BASE = process.env.EHRBASE_URL;
const headers = {
  Authorization: 'Basic ' + Buffer.from(
    `${(process.env.EHRBASE_USER ?? '').trim()}:${(process.env.EHRBASE_PASSWORD ?? '').trim()}`,
  ).toString('base64'),
  'X-API-Key': process.env.EHRBASE_API_KEY ?? '',
  Accept: 'application/json',
};

const sql = postgres(process.env.DATABASE_URL);

async function aql(q) {
  const r = await fetch(`${BASE}/ehrbase/rest/openehr/v1/query/aql`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q }),
  });
  if (!r.ok) throw new Error(`AQL ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).rows ?? [];
}

try {
  const rows = await aql(`
    SELECT e/ehr_id/value as ehr_id,
           c/uid/value    as uid,
           c              as composition
      FROM EHR e CONTAINS COMPOSITION c`);

  // ehr_id -> the facility that registered the patient
  const patients = await sql`
    SELECT ehrid, workspaceid FROM patients WHERE ehrid IS NOT NULL`;
  const facilityOfEhr = new Map(
    patients.filter((p) => p.workspaceid).map((p) => [p.ehrid, p.workspaceid]),
  );

  const known = new Set((await sql`SELECT workspaceid FROM workspaces`).map((w) => w.workspaceid));

  // A composer who belongs to exactly one facility wrote it there. One who
  // belongs to several tells us nothing, and a wrong facility on a clinical
  // document is worse than no row at all — those are left to the fallback.
  const composers = await sql`
    SELECT u.name, min(wu.workspaceid::text) AS workspaceid, count(DISTINCT wu.workspaceid)::int AS n
      FROM users u JOIN workspaceusers wu ON wu.userid = u.userid
     GROUP BY u.name`;
  const facilityOfComposer = new Map(
    composers.filter((c) => c.n === 1).map((c) => [c.name.trim(), c.workspaceid]),
  );

  let byRouting = 0, byPatient = 0, byComposer = 0, ambiguous = 0, unresolved = 0, written = 0;
  const plan = [];

  for (const [ehrId, uid, composition] of rows) {
    // The clinician's routing choice, wherever it appears in the document.
    const text = JSON.stringify(composition ?? {});
    const routed = text.match(/LabWorkspaceId:\s*([0-9a-f-]{36})/i)?.[1];

    const owner = routed && known.has(routed) ? routed : null;
    let creator = facilityOfEhr.get(ehrId) ?? null;
    let fromComposer = false;
    if (!creator) {
      const name = composition?.composer?.name?.trim();
      const viaComposer = name ? facilityOfComposer.get(name) : null;
      if (viaComposer) { creator = viaComposer; fromComposer = true; }
      else if (name) { ambiguous++; }
    }

    if (!creator && !owner) { unresolved++; continue; }
    if (owner) byRouting++;
    else if (fromComposer) byComposer++;
    else byPatient++;

    // The creating facility is the patient's; the routed lab, when named, is
    // the one the order was sent to. Either alone is enough to be visible.
    plan.push({ uid, workspaceid: creator ?? owner, ownerworkspaceid: owner, ehrId });
  }

  console.log(`compositions        : ${rows.length}`);
  console.log(`  routed to a lab   : ${byRouting}`);
  console.log(`  by patient's site : ${byPatient}`);
  console.log(`  by composer's site: ${byComposer}`);
  console.log(`  composer ambiguous: ${ambiguous}  (belongs to several facilities)`);
  console.log(`  unresolved        : ${unresolved}`);

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these rows.');
  } else {
    for (const p of plan) {
      await sql`
        INSERT INTO composition_ownership
          (composition_uid, workspaceid, ownerworkspaceid, ehrid, kind)
        VALUES (${p.uid}, ${p.workspaceid}::uuid, ${p.ownerworkspaceid}::uuid,
                ${p.ehrId}, 'backfilled')
        ON CONFLICT (composition_uid) DO NOTHING`;
      written++;
    }
    console.log(`\nwrote ${written} ownership rows.`);
  }
} finally {
  await sql.end();
}
