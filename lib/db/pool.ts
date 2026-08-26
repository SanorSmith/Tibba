/**
 * A `pg`-shaped `pool.query(text, params)` that runs on the tenant connection.
 *
 * A dozen routes were written against `pg` directly:
 *
 *     const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
 *
 * That is a second connection to the same database, opened from a second
 * environment variable, and it is invisible to everything this codebase does
 * about tenancy. `withTenant` establishes the facility by opening a
 * transaction on the *shared* connection and putting it in AsyncLocalStorage;
 * a query issued on a privately-owned pool never sees it. Three of those
 * routes did call `withTenant`, which made no difference at all — the wrapper
 * scoped a connection the query then declined to use.
 *
 * It also meant those routes ignored `DATABASE_URL` entirely, so pointing the
 * application at the restricted role would have left them connected as the
 * owner, reading every facility.
 *
 * Rewriting each query into drizzle's builder would be a large diff across
 * routes with no test coverage. This keeps the call sites exactly as they are
 * and changes only where the query runs: `db` resolves to the current
 * tenant's transaction, so these queries now obey row-level security like
 * every other one.
 *
 * Not a general `pg` Pool — it implements `query` and nothing else. That is
 * all these call sites use, and anything reaching for `connect()` or the
 * event emitter should be using drizzle instead.
 */
import { sql, type SQL, type SQLChunk } from "drizzle-orm";
import { db } from "./index";

/**
 * Rebuilds a `$1`-style statement as a drizzle fragment.
 *
 * The literal text is passed through untouched and each placeholder becomes a
 * bound parameter, so values stay parameterised exactly as `pg` sent them —
 * this is a change of transport, not of escaping.
 */
function toFragment(text: string, params: readonly unknown[]): SQL {
  const chunks: SQLChunk[] = [];
  const placeholder = /\$(\d+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholder.exec(text)) !== null) {
    if (match.index > cursor) chunks.push(sql.raw(text.slice(cursor, match.index)));
    chunks.push(sql`${params[Number(match[1]) - 1]}`);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) chunks.push(sql.raw(text.slice(cursor)));

  return sql.join(chunks, sql.raw(""));
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export const pool = {
  async query<T = Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    const result = await db.execute(toFragment(text, params));
    // postgres-js hands back an array of rows that also carries `count`, which
    // is the affected-row count for statements without RETURNING.
    const rows = result as unknown as T[];
    const affected = (result as unknown as { count?: number }).count;
    return { rows, rowCount: affected ?? rows.length };
  },
};
