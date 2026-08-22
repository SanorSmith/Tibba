import { Pool } from 'pg';

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

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
