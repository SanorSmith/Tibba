/**
 * Does every row still reach somebody?
 *
 * A policy that hides rows from every facility is not isolation, it is data
 * loss that reports success. For each newly protected table this counts the
 * rows the owner can see, then adds up what each facility sees in turn. The
 * two should match.
 *
 *   node scripts/verify-visibility.mjs <app_user-connection-string>
 */
import { config } from 'dotenv';
import postgres from 'postgres';
config({ path: '.env.local' });

const appUrl = process.argv[2];
if (!appUrl) { console.error('pass the app_user connection string'); process.exit(1); }

const owner = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const app = postgres(appUrl, { max: 1, onnotice: () => {} });

const tables = (await owner`
  SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity ORDER BY 1`).map((r) => r.t);
const spaces = (await owner`SELECT workspaceid FROM workspaces`).map((r) => r.workspaceid);

const lost = [], ok = [];
for (const t of tables) {
  let total;
  try { [{ total }] = await owner.unsafe(`SELECT count(*)::int total FROM ${t}`); }
  catch { continue; }
  if (!total) continue;

  let seen = 0;
  for (const ws of spaces) {
    try {
      await app.begin(async (tx) => {
        await tx`SELECT set_config('app.workspace_id', ${ws}, true)`;
        const [{ c }] = await tx.unsafe(`SELECT count(*)::int c FROM ${t}`);
        seen += c;
      });
    } catch { /* unreadable in this facility */ }
  }
  (seen < total ? lost : ok).push({ table: t, total, visible: seen });
}

console.log(`tables checked : ${lost.length + ok.length}`);
console.log(`every row visible to at least one facility: ${ok.length}`);
if (lost.length) {
  console.log(`\nROWS NO FACILITY CAN SEE (${lost.length} tables):`);
  console.table(lost.map((x) => ({ ...x, hidden: x.total - x.visible })));
} else {
  console.log('nothing became invisible');
}
await owner.end(); await app.end();
