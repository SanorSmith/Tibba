/**
 * Running the "self-migrating" DDL that several routes carry, without
 * requiring the application's database role to be able to change the schema.
 *
 * Nineteen feature routes open with `CREATE TABLE IF NOT EXISTS` or
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` before doing their actual work.
 * Every one of those statements is idempotent and already satisfied in
 * production — the tables and columns exist, and have for months. They are
 * schema migrations that ended up inside request handlers.
 *
 * That was harmless while the app connected as the database owner. It stops
 * being harmless the moment it connects as a role that may only read and
 * write rows, which is the whole point of the restricted role: an endpoint
 * serving a web request has no business altering tables. So the statement
 * fails with insufficient_privilege, and a route that only wanted to list
 * insurance companies returns a 500.
 *
 * This runs the statement and treats *only* a privilege refusal as success.
 * Under the owning role nothing changes. Under the restricted role the DDL is
 * skipped and the route proceeds to the query it actually meant to run.
 *
 * Any other failure — bad SQL, a missing table, a constraint violation — is
 * rethrown, because those mean something is genuinely wrong.
 *
 * This is a bridge, not a destination. Schema belongs in
 * `src/lib/db/migrations`, and each of these blocks should eventually move
 * there and be deleted from the request path.
 */
import { pool } from './pool';

/** Postgres: insufficient_privilege. */
const INSUFFICIENT_PRIVILEGE = '42501';

/**
 * Whether this connection may change the schema at all, asked once.
 *
 * Catching the failure afterwards is not enough: these statements run inside
 * `withTenant`, and a failed statement aborts the whole transaction. Every
 * query after it then returns "current transaction is aborted" — so the route
 * still breaks, just with a more confusing error. The statement has to not be
 * issued in the first place.
 */
let mayAlterSchema: Promise<boolean> | null = null;

function canAlterSchema(): Promise<boolean> {
  if (!mayAlterSchema) {
    mayAlterSchema = pool
      .query("SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS ok")
      .then((r) => Boolean(r.rows[0]?.ok))
      .catch(() => false);
  }
  return mayAlterSchema;
}

export async function ensureSchema(sql: string, params?: unknown[]): Promise<void> {
  if (!(await canAlterSchema())) {
    // The restricted role. Whatever this wanted to create already exists —
    // these statements are all `IF NOT EXISTS` against tables the app has
    // been using for months.
    return;
  }
  try {
    await pool.query(sql, params as never);
  } catch (error) {
    if ((error as { code?: string })?.code === INSUFFICIENT_PRIVILEGE) return;
    throw error;
  }
}
