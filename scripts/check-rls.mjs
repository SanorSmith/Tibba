/**
 * Is row-level security actually enforcing, or only installed?
 *
 * The two are easy to confuse. Every policy can be present and correct while
 * none of them apply, because a role holding BYPASSRLS ignores all of them.
 * That is deliberately the state this system was built in — it is what made
 * it safe to add policies to a live database — but it means "the policies
 * exist" proves nothing on its own.
 *
 * Run:  node scripts/check-rls.mjs [connection-string]
 *
 * With no argument it reads DATABASE_URL from .env.local, which is your local
 * setting, not production's. To check what production is really doing, pass
 * its connection string, or pull it first:
 *
 *   npx vercel env pull .env.check --environment=production --yes
 *   node scripts/check-rls.mjs "$(grep -oE 'postgresql://[^\"]+' .env.check | head -1)"
 *   rm .env.check
 */
import 'dotenv/config';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error('No connection string. Pass one, or set DATABASE_URL.');
  process.exit(1);
}

const sql = postgres(url);
const role = url.split('://')[1]?.split(':')[0] ?? '(unknown)';

try {
  const [{ bypass }] = await sql`
    SELECT rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`;

  const [{ tables }] = await sql`
    SELECT count(*)::int AS tables FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity`;

  const [{ policies }] = await sql`
    SELECT count(*)::int AS policies FROM pg_policies WHERE schemaname = 'public'`;

  console.log(`connected as       : ${role}`);
  console.log(`tables with RLS on : ${tables}`);
  console.log(`policies           : ${policies}`);
  console.log(`role bypasses RLS  : ${bypass}`);

  // The part that actually settles it. Set one facility's identity, then ask
  // for rows belonging to everyone. A role that is being governed can only
  // see its own; a bypassing role sees the lot, policies or no policies.
  const [ws] = await sql`
    SELECT workspaceid, name FROM workspaces
     WHERE workspaceid IN (SELECT workspaceid FROM invoices) LIMIT 1`;

  if (!ws) {
    // Reaching here without a tenant set is itself the answer. A governed
    // connection cannot list facilities until it is inside one — the
    // fail-closed direction. A bypassing role would have found rows.
    console.log(
      bypass
        ? '\nNo invoices to test against; cannot judge from this database.'
        : '\nENFORCING — with no facility set, this connection sees nothing at all,'
          + '\nwhich is the fail-closed behaviour the policies exist to produce.',
    );
  } else {
    await sql.begin(async (tx) => {
      await tx`SELECT set_config('app.workspace_id', ${ws.workspaceid}, true)`;
      const [mine] = await tx`
        SELECT count(*)::int AS c FROM invoices WHERE workspaceid = ${ws.workspaceid}`;
      const [visible] = await tx`SELECT count(*)::int AS c FROM invoices`;

      console.log(`\nposing as          : ${ws.name.trim()}`);
      console.log(`its own invoices   : ${mine.c}`);
      console.log(`invoices visible   : ${visible.c}`);
      console.log(
        visible.c > mine.c
          ? '\nNOT ENFORCING — this connection can read other facilities.'
          : '\nENFORCING — this connection sees only its own facility.',
      );
    });
  }
} finally {
  await sql.end();
}
