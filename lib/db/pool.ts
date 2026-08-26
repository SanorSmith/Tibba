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
 * Not a general `pg` Pool. It covers `query`, `end` and `connect` because
 * that is what these call sites use; anything reaching past those — the event
 * emitter, listen/notify, a cursor — should be using drizzle instead.
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

/** `BEGIN`, `COMMIT`, `ROLLBACK` — with optional whitespace or semicolon. */
const TRANSACTION_CONTROL = /^\s*(begin|commit|rollback|start\s+transaction)\s*;?\s*$/i;

export const pool = {
  /**
   * Rows default to `any`, matching what `pg` returned.
   *
   * Not an improvement worth making here: the call sites this replaces read
   * columns straight off the row and pass them to `parseInt`, and tightening
   * the type would turn a connection change into a hundred unrelated edits.
   * Callers that want a shape can still supply one.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    // See `connect` below: the enclosing `withTenant` owns the transaction,
    // so a hand-written BEGIN/COMMIT here would fight it.
    if (TRANSACTION_CONTROL.test(text)) {
      return { rows: [], rowCount: 0 };
    }
    const result = await db.execute(toFragment(text, params));
    // postgres-js hands back an array of rows that also carries `count`, which
    // is the affected-row count for statements without RETURNING.
    const rows = result as unknown as T[];
    const affected = (result as unknown as { count?: number }).count;
    return { rows, rowCount: affected ?? rows.length };
  },

  /**
   * Deliberately does nothing.
   *
   * Several routes built a pool per request and closed it in a `finally`.
   * There is no longer a pool of their own to close, and closing the shared
   * connection would take down every other request in the process. Keeping
   * the method means those `finally` blocks need no edit — and an edit that
   * has to be made in 27 places is an edit that gets missed in one.
   */
  async end(): Promise<void> {},

  /**
   * A checked-out client, for the routes that manage a transaction by hand.
   *
   * Those routes bracket their work with `BEGIN` / `COMMIT`, and `ROLLBACK`
   * in a catch that rethrows. Running that inside `withTenant` would be
   * actively wrong — the `COMMIT` would commit the *outer* transaction, the
   * one carrying the facility, while the request was still going.
   *
   * So the transaction-control statements are dropped and the surrounding
   * `withTenant` provides the atomicity instead: it is already a transaction,
   * and drizzle rolls it back when the callback throws. Both call sites
   * rethrow after their `ROLLBACK`, so an error still aborts everything. That
   * rethrow is what makes this safe — a catch that swallowed the error would
   * let a half-finished write commit, so check for it before adding a third
   * caller.
   */
  async connect() {
    return {
      query: pool.query,
      release() {},
    };
  },
};

