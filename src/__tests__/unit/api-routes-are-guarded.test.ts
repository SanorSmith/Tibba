/**
 * No API route may reach the database without first establishing who is asking.
 *
 * The middleware treats every path under `/api` as public - see PUBLIC_PATHS in
 * src/middleware.ts - so each route is solely responsible for checking its own
 * caller. Nine of them never did. Seven of those ran data-definition statements
 * against the production database, one of them dropping a foreign key, on an
 * unauthenticated request from anywhere on the internet.
 *
 * They were deleted rather than fixed, because all nine were dead: nothing in
 * the application called them, and two queried tables that do not exist.
 *
 * This test exists so the next one is caught while it is being written. It
 * reads the route files rather than calling them, which means it costs nothing
 * and cannot be skipped by a route that happens to be hard to invoke.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

function routeFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, found);
    else if (entry === 'route.ts') found.push(full);
  }
  return found;
}

/** How a route establishes who is asking. Any one of these counts. */
const IDENTIFIES_CALLER = [
  'getWorkspaceId',
  'readSession',
  'getCurrentUser',
  'requireAuth',
  'verifySession',
  'accountManager',
];

/** Talks to the database at all. */
const TOUCHES_DB = /\b(pool|client|rawPool)\s*!?\.\s*(query|connect)\s*\(|\bdb\s*\.\s*(select|insert|update|delete)\s*\(/;

/**
 * Routes that answer before anyone can be signed in, and are allowed to.
 * Each is a sign-in step: the caller has no session yet, which is the point.
 * Adding to this list is a deliberate act, which is why it is a list rather
 * than a pattern.
 */
const SIGN_IN_PATHS = [
  'auth/login',
  'auth/credentials',
  'auth/google/callback',
  'auth/google/facilities',
  'auth/google/select',
  'auth/handoff',
  'auth/logout',
];

const relative = (f: string) =>
  f.replace(API_ROOT, '').replace(/\\/g, '/').replace(/^\//, '').replace('/route.ts', '');

describe('every API route establishes who is asking', () => {
  const files = routeFiles(API_ROOT);

  it('finds the routes to check', () => {
    // A path change that silently matched nothing would make every assertion
    // below pass by having nothing to assert on.
    expect(files.length).toBeGreaterThan(150);
  });

  it('no route queries the database without identifying the caller', () => {
    const unguarded: string[] = [];

    for (const file of files) {
      const name = relative(file);
      if (SIGN_IN_PATHS.some((p) => name === p || name.startsWith(p + '/'))) continue;

      const source = readFileSync(file, 'utf8');
      if (!TOUCHES_DB.test(source)) continue;
      if (IDENTIFIES_CALLER.some((fn) => source.includes(fn))) continue;

      unguarded.push(name);
    }

    // Named in the failure rather than counted, so whoever sees this knows
    // which file to open.
    expect(unguarded).toEqual([]);
  });

  it('no route destroys part of the schema', () => {
    // Twelve migration helpers were deleted: seven unauthenticated, five that
    // merely required any signed-in user. Two of them dropped foreign keys on
    // `appointments`, a table every facility shares, so a receptionist in one
    // hospital could remove a constraint protecting all of them. One of the
    // five even carried a comment naming that blast radius, and was left in
    // anyway. Migrations belong in lib/db/migrations, applied deliberately,
    // not behind an HTTP verb.
    //
    // Only destruction is asserted on. A dozen routes still create tables and
    // add columns with IF NOT EXISTS on first use, which is untidy but not
    // dangerous, and unpicking it is its own piece of work.
    const destructive = /\bDROP\s+(TABLE|CONSTRAINT|COLUMN)\b|\bALTER\s+TABLE\s+\w+\s+DROP\b|\bTRUNCATE\b/i;
    const offenders = files
      .filter((f) => destructive.test(readFileSync(f, 'utf8')))
      .map(relative);

    expect(offenders).toEqual([]);
  });
});
