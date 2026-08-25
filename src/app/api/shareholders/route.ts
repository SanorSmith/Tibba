/**
 * /api/shareholders
 * GET  — list shareholders (raw array, optional ?status= &type= &search=)
 * POST — create a shareholder
 *
 * Roadmap: "give an overview of the shareholders that have equity in the
 * business hospital and can register new shareholders."
 * Auto-creates the table on first call and seeds the 7 sample shareholders.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import { ensureSchema } from '@/lib/db/ensure-schema';

export const dynamic = 'force-dynamic';


async function ensureTable(p: Pool) {
  await ensureSchema(`
    CREATE TABLE IF NOT EXISTS shareholders (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shareholder_id            VARCHAR(50) UNIQUE,
      full_name                 VARCHAR(255) NOT NULL,
      full_name_ar              VARCHAR(255),
      email                     VARCHAR(255),
      phone                     VARCHAR(50),
      mobile                    VARCHAR(50),
      address                   TEXT,
      address_ar                TEXT,
      city                      VARCHAR(100),
      country                   VARCHAR(100),
      national_id               VARCHAR(100),
      passport_number           VARCHAR(100),
      date_of_birth             DATE,
      nationality               VARCHAR(100),
      share_percentage          NUMERIC(7,4) DEFAULT 0,
      number_of_shares          NUMERIC(15,2) DEFAULT 0,
      share_value               NUMERIC(15,2) DEFAULT 0,
      investment_amount         NUMERIC(15,2) DEFAULT 0,
      investment_date           DATE,
      shareholder_type          VARCHAR(30) DEFAULT 'INDIVIDUAL',
      company_name              VARCHAR(255),
      company_registration      VARCHAR(100),
      status                    VARCHAR(30) DEFAULT 'ACTIVE',
      is_board_member           BOOLEAN DEFAULT false,
      board_position            VARCHAR(100),
      total_dividends_received  NUMERIC(15,2) DEFAULT 0,
      last_dividend_date        DATE,
      notes                     TEXT,
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_at                TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // The seed block that used to live here has been removed.
  //
  // It counted rows and inserted seven sample shareholders when it found
  // none. My earlier comment claimed the count was "deliberately unscoped"
  // so the check could never fire — that stopped being true the moment
  // row-level security began scoping it. Under the restricted role a
  // facility with no shareholders counts zero, tries to insert demo rows
  // with no facility of their own, and the request fails.
  //
  // The seed rows exist. Creating sample data as a side effect of a GET was
  // never right, and it is actively wrong now.
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    await ensureTable(pool);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type   = searchParams.get('type');
    const search = searchParams.get('search');

    let q = 'SELECT * FROM shareholders WHERE workspaceid = $1';
    const params: any[] = [workspaceId];
    let idx = 2;
    if (status) { q += ` AND status = $${idx++}`; params.push(status); }
    if (type)   { q += ` AND shareholder_type = $${idx++}`; params.push(type); }
    if (search) {
      q += ` AND (LOWER(full_name) LIKE $${idx} OR LOWER(shareholder_id) LIKE $${idx} OR LOWER(COALESCE(email,'')) LIKE $${idx})`;
      params.push(`%${search.toLowerCase()}%`); idx++;
    }
    q += ' ORDER BY share_percentage DESC NULLS LAST, created_at DESC';

    const result = await pool.query(q, params);
    // Page expects a raw array
    return NextResponse.json(result.rows);
    });
  } catch (error) {
    console.error('[shareholders GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    await ensureTable(pool);
    const b = await request.json();
    if (!b.full_name) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
    }
    // Auto-generate shareholder_id if not provided
    let shareholderId = b.shareholder_id;
    if (!shareholderId) {
      const max = await pool.query(
        `SELECT shareholder_id FROM shareholders
         WHERE shareholder_id LIKE 'SH-%' AND workspaceid = $1
         ORDER BY shareholder_id DESC LIMIT 1`,
        [workspaceId]
      );
      const n = max.rows[0] ? parseInt(max.rows[0].shareholder_id.replace('SH-', '')) + 1 : 1;
      shareholderId = `SH-${String(n).padStart(3, '0')}`;
    }

    const result = await pool.query(
      `INSERT INTO shareholders (
         shareholder_id, full_name, full_name_ar, email, phone, mobile, address, address_ar,
         city, country, national_id, passport_number, date_of_birth, nationality,
         share_percentage, number_of_shares, share_value, investment_amount, investment_date,
         shareholder_type, company_name, company_registration, status, is_board_member,
         board_position, notes, workspaceid
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
       ) RETURNING *`,
      [
        shareholderId, b.full_name, b.full_name_ar || null, b.email || null, b.phone || null,
        b.mobile || null, b.address || null, b.address_ar || null, b.city || null, b.country || null,
        b.national_id || null, b.passport_number || null, b.date_of_birth || null, b.nationality || null,
        b.share_percentage || 0, b.number_of_shares || 0, b.share_value || 0, b.investment_amount || 0,
        b.investment_date || null, b.shareholder_type || 'INDIVIDUAL', b.company_name || null,
        b.company_registration || null, b.status || 'ACTIVE', b.is_board_member || false,
        b.board_position || null, b.notes || null, workspaceId,
      ]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
    });
  } catch (error) {
    console.error('[shareholders POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
