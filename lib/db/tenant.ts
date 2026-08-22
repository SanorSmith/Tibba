/**
 * Runs work with a facility's identity attached to the database connection.
 *
 * Row-level security decides what a query can see by reading
 * `app.workspace_id` from the connection. That setting has to be established
 * on the same connection the query runs on, which means inside a transaction —
 * `SET LOCAL` scopes it to the transaction and Postgres discards it at COMMIT
 * or ROLLBACK. A plain `SET` would leak one facility's identity to whichever
 * request picked up that connection next, and through a pooler that is exactly
 * what happens.
 *
 * The id must come from the verified session. Taking it from the URL would
 * hand the caller the very thing the policy is meant to decide.
 *
 * Anything reached outside this wrapper sees nothing rather than everything:
 * an unset setting reads back as an empty string, NULLIF turns that into NULL,
 * and NULL matches no row. Failures close the door instead of opening it.
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withTenant<T>(
  workspaceId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  if (!workspaceId) {
    throw new Error("withTenant requires a workspace id — refusing to run untenanted.");
  }
  return db.transaction(async (tx) => {
    // Parameterised rather than interpolated: set_config is a function call,
    // so the id cannot terminate the statement. `true` makes it transaction-local.
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
    return fn(tx);
  });
}

/**
 * For the admin routes and the login flow, which read across facilities by
 * design. Named so that it is obvious in review when a query is deliberately
 * unscoped, and so those call sites can be found later.
 *
 * This only works while the connection belongs to a role holding BYPASSRLS —
 * app_admin. Under app_user it returns nothing, which is the safe direction.
 */
export async function withoutTenant<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  void reason;
  return fn();
}
