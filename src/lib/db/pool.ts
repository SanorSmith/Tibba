import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

// The one connection pool for the whole application. Every route and service
// shares it — nothing else may call `new Pool`. That single choke point is
// what later lets a request's tenant identity ride on its connection
// (SET LOCAL inside a transaction) for row-level security.
//
// No fallback URL on purpose: the previous default embedded the production
// password in source, and a missing env var silently connected dev tooling to
// production. Failing loudly here is the better failure.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — refusing to start without a database.');
}

const realPool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/** The underlying pool. Only the tenant wrapper should reach for this. */
export const rawPool = realPool;

/**
 * The transaction client carrying the current facility's identity, when the
 * work is inside `withTenant`. It lives here rather than in tenant.ts so the
 * proxy below can read it with a plain import — an earlier version reached for
 * it with `require()` to dodge a circular import, which is not available in
 * the bundled server and made every query throw.
 */
export const tenantClient = new AsyncLocalStorage<PoolClient>();

// Every call site says `pool.query(...)`. Inside withTenant that must run on
// the transaction holding the tenant setting, and outside it on the pool as
// before — so `pool` forwards to whichever applies. 212 files keep working
// unchanged, and a handler opts in simply by being wrapped.
export const pool = new Proxy(realPool, {
  get(target, prop, receiver) {
    if (prop === 'query') {
      const client = tenantClient.getStore();
      const source = client ?? target;
      return source.query.bind(source);
    }

    // `connect` had to be forwarded too. Intercepting only `query` meant a
    // route that checked out its own client — 26 files do, and the exported
    // `query`/`transaction` helpers below do as well — got a *different*
    // connection from the pool, one withTenant had never set the facility on.
    // Its inserts then arrived with no tenant, so the stamping trigger wrote
    // null and the NOT NULL constraint rejected the row: "null value in
    // column workspaceid of relation patients". Reads were worse, because
    // they simply came back empty and said nothing.
    //
    // Inside withTenant the checked-out client IS the tenant's connection.
    // `release` is a no-op because withTenant owns it and releases it itself,
    // and BEGIN/COMMIT/ROLLBACK are dropped because withTenant is already a
    // transaction — a COMMIT here would end the one carrying the facility
    // while the request was still running. Callers that ROLLBACK still
    // rethrow, so an error aborts the outer transaction and nothing partial
    // commits.
    if (prop === 'connect') {
      const client = tenantClient.getStore();
      if (!client) return target.connect.bind(target);
      return async () => ({
        query: (text: unknown, params?: unknown) =>
          typeof text === 'string' && /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;?\s*$/i.test(text)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : (client.query as (t: unknown, p?: unknown) => Promise<unknown>)(text, params),
        release() {},
      });
    }

    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof realPool;

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
