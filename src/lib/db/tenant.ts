/**
 * Attaches a facility's identity to the database connection for the duration
 * of a piece of work.
 *
 * Row-level security decides what a query may see by reading
 * `app.workspace_id` off the connection, so the setting has to live on the
 * same connection the query runs on. That means a transaction: `SET LOCAL`
 * is scoped to it and Postgres discards the value at COMMIT or ROLLBACK.
 * A plain `SET` would leave one facility's identity on a pooled connection
 * for whichever request picked it up next.
 *
 * The awkward part is that this codebase has 212 files calling `pool.query()`
 * directly. Rather than rewrite every one to thread a client through, the
 * exported `pool` checks async local storage first: inside `withTenant` it
 * uses that transaction's client, and outside it behaves exactly as before.
 * Call sites do not change; only the handler needs wrapping.
 *
 * The id must come from the verified session — taking it from the URL would
 * hand the caller the decision the policy exists to make.
 */
import type { PoolClient } from 'pg';
import { rawPool, tenantClient } from './pool';

/** The client for the current tenant scope, if any work is inside one. */
export function currentClient(): PoolClient | undefined {
  return tenantClient.getStore();
}

export async function withTenant<T>(
  workspaceId: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!workspaceId) {
    throw new Error('withTenant requires a workspace id — refusing to run untenanted.');
  }
  const client = await rawPool.connect();
  try {
    await client.query('BEGIN');
    // set_config rather than string interpolation: the id is a parameter, so
    // it cannot terminate the statement. `true` makes it transaction-local.
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [workspaceId]);
    const result = await tenantClient.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * For the admin routes and the login flow, which read across facilities by
 * design. Named so it is obvious in review that a query is deliberately
 * unscoped, and so those call sites stay findable.
 *
 * Only actually reads across tenants while connected as a role holding
 * BYPASSRLS. Under the restricted role it returns nothing — the safe
 * direction for a mistake.
 */
export async function withoutTenant<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  void reason;
  return fn();
}
