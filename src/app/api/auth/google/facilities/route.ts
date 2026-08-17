/**
 * GET /api/auth/google/facilities — which facilities the pending Google
 * identity may open.
 *
 * Reads the identity from the signed cookie the callback set, never from the
 * request, so this cannot be used to enumerate another account's facilities.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { GOOGLE_PENDING_COOKIE, readPendingIdentity } from '@/lib/auth/google';
import { resolveFacility } from '@/lib/auth/facility-session';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL || process.env.DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = readPendingIdentity(request.cookies.get(GOOGLE_PENDING_COOKIE)?.value);
  if (!email) {
    return NextResponse.json({ error: 'Sign-in expired' }, { status: 401 });
  }

  const r = await pool.query(
    'SELECT userid FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: 'Account not found' }, { status: 403 });
  }

  const resolution = await resolveFacility(pool, r.rows[0].userid);

  if (resolution.kind === 'choose') {
    return NextResponse.json({ email, facilities: resolution.facilities });
  }

  if (resolution.kind === 'resolved') {
    // Only one after all — still let the picker show it rather than signing
    // them in from a GET.
    const m = resolution.membership;
    return NextResponse.json({
      email,
      facilities: [
        {
          workspaceId: m.workspaceid,
          name: m.workspace_name.trim(),
          type: m.ws_type,
          role: m.ws_role,
        },
      ],
    });
  }

  return NextResponse.json({ error: resolution.error }, { status: resolution.status });
}
