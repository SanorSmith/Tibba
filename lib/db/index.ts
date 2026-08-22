import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = postgres(dbUrl.includes("sslmode=") ? dbUrl : `${dbUrl}?sslmode=require`);
const baseDb = drizzle(client, { schema });

export type Database = typeof baseDb;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * The transaction carrying the current facility's identity, when the work is
 * running inside `withTenant`. Row-level security reads `app.workspace_id`
 * off the connection, so a query only sees the right rows if it runs on that
 * transaction's connection rather than an arbitrary one from the pool.
 */
export const tenantStorage = new AsyncLocalStorage<Tx>();

/**
 * Hundreds of call sites already say `db.select(...)`. Rather than thread a
 * transaction through every one — and risk missing some, which would silently
 * read outside the tenant scope — `db` resolves to the current tenant's
 * transaction when there is one, and to the plain connection otherwise.
 *
 * Outside a tenant scope this is not a hole: the policies compare against an
 * unset setting, which is NULL, and NULL matches no row. An unwrapped query
 * returns nothing rather than everything.
 */
export const db = new Proxy(baseDb, {
  get(target, prop, receiver) {
    const active = tenantStorage.getStore();
    const source = (active ?? target) as unknown as Record<string | symbol, unknown>;
    const value = source[prop];
    return typeof value === "function" ? value.bind(source) : value;
  },
}) as Database;

/** Escape hatch for the tenant wrapper itself, which must not re-enter the proxy. */
export const rootDb = baseDb;

// Export the raw client for cleanup purposes
export const rawClient = client;
