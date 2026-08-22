/**
 * Runs work with a facility's identity attached to the database connection.
 *
 * Row-level security decides what a query can see by reading
 * `app.workspace_id` from the connection. That setting has to be established
 * on the same connection the query runs on, which means inside a transaction —
 * `SET LOCAL` scopes it there and Postgres discards it at COMMIT or ROLLBACK.
 * A plain `SET` would leave one facility's identity on a pooled connection for
 * whichever request picked it up next.
 *
 * Existing call sites keep saying `db.select(...)`: `db` resolves to this
 * transaction while the work is inside the wrapper (see ./index.ts), so a
 * handler opts in by being wrapped rather than by being rewritten.
 *
 * The id must come from the verified session, or from a URL id that has been
 * checked against membership first. Passing an unchecked URL value would hand
 * the caller the very decision the policy exists to make.
 */
import { rootDb, tenantStorage } from "./index";
import { sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof rootDb.transaction>[0]>[0];

export async function withTenant<T>(
  workspaceId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  if (!workspaceId) {
    throw new Error("withTenant requires a workspace id — refusing to run untenanted.");
  }
  return rootDb.transaction(async (tx) => {
    // set_config with a bound parameter, not string interpolation: the id
    // cannot terminate the statement. `true` makes it transaction-local.
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
    return tenantStorage.run(tx, () => fn(tx));
  });
}

/**
 * For the admin routes and the login flow, which read across facilities by
 * design. Named so it is obvious in review that a query is deliberately
 * unscoped, and so those call sites stay findable.
 *
 * Only genuinely reads across tenants while connected as a role holding
 * BYPASSRLS. Under the restricted role it returns nothing — the safe
 * direction for a mistake.
 */
export async function withoutTenant<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  void reason;
  return fn();
}
