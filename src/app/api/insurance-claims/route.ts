import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


// Only called by POST — DDL in GET causes race conditions under React Strict Mode
async function ensureTable(client: Pool) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurance_claims (
        id VARCHAR(50) PRIMARY KEY,
        claim_number VARCHAR(100) UNIQUE NOT NULL,
        invoice_id VARCHAR(50) NOT NULL,
        invoice_number VARCHAR(100),
        patient_id VARCHAR(255),
        patient_name VARCHAR(255),
        patient_name_ar VARCHAR(255),
        insurance_company_id VARCHAR(50),
        insurance_company_name VARCHAR(255),
        claim_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        approved_amount NUMERIC(15,2) DEFAULT 0,
        paid_amount NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'SUBMITTED',
        service_date DATE,
        submission_date DATE DEFAULT CURRENT_DATE,
        approval_date DATE,
        payment_date DATE,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    // Table already exists or concurrent creation — safe to ignore
    console.warn('insurance_claims table ensure warning:', (e as Error).message);
  }
  // Create indexes independently so one failure doesn't block the others
  for (const [name, col] of [
    ['idx_insurance_claims_invoice', 'invoice_id'],
    ['idx_insurance_claims_status', 'status'],
    ['idx_insurance_claims_company', 'insurance_company_id'],
  ] as const) {
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS ${name} ON insurance_claims(${col})`);
    } catch {
      // Index already exists — safe to ignore
    }
  }
}

// GET /api/insurance-claims
// Query params: status, insurance_company_id, date_from, date_to, invoice_id, page, limit
export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    // Check table exists without DDL (avoids lock contention from Strict Mode double-invoke)
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'insurance_claims'
      ) AS exists
    `);

    if (!tableCheck.rows[0].exists) {
      // First visit — return empty state; POST will create the table on first claim
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          total_claims: '0', total_claimed: '0', total_approved: '0',
          total_paid: '0', pending_amount: '0', submitted_count: '0',
          approved_count: '0', paid_count: '0', rejected_count: '0', review_count: '0',
        },
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
    }

    const sp = new URL(request.url).searchParams;
    const status    = sp.get('status');
    const companyId = sp.get('insurance_company_id');
    const dateFrom  = sp.get('date_from');
    const dateTo    = sp.get('date_to');
    const invoiceId = sp.get('invoice_id');
    const page      = Math.max(1, parseInt(sp.get('page')  || '1'));
    const limit     = Math.max(1, parseInt(sp.get('limit') || '50'));
    const offset    = (page - 1) * limit;

    // Build WHERE clause with explicit parameter numbering
    // Facility filter first, so it is always present regardless of which
    // optional filters the caller supplied.
    const values: unknown[]    = [workspaceId];
    const conditions: string[] = ['workspaceid = $1'];

    if (status && status !== 'ALL')  { conditions.push(`status = $${values.push(status)}`); }
    if (companyId)                   { conditions.push(`insurance_company_id = $${values.push(companyId)}`); }
    if (dateFrom)                    { conditions.push(`submission_date >= $${values.push(dateFrom)}`); }
    if (dateTo)                      { conditions.push(`submission_date <= $${values.push(dateTo)}`); }
    if (invoiceId)                   { conditions.push(`invoice_id = $${values.push(invoiceId)}`); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM insurance_claims ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);

    // Paginated rows — push LIMIT/OFFSET onto a fresh copy of values
    const rowValues = [...values, limit, offset];
    const limitPos  = rowValues.length - 1;
    const offsetPos = rowValues.length;
    const claimsResult = await pool.query(
      `SELECT * FROM insurance_claims ${where}
       ORDER BY created_at DESC
       LIMIT $${limitPos} OFFSET $${offsetPos}`,
      rowValues
    );

    // Aggregate stats (always over full table, not filtered)
    const statsResult = await pool.query(`
      SELECT
        COUNT(*)                                                          AS total_claims,
        COALESCE(SUM(claim_amount),    0)                                 AS total_claimed,
        COALESCE(SUM(approved_amount), 0)                                 AS total_approved,
        COALESCE(SUM(paid_amount),     0)                                 AS total_paid,
        COALESCE(SUM(CASE WHEN status IN ('SUBMITTED','UNDER_REVIEW')
                     THEN claim_amount ELSE 0 END), 0)                    AS pending_amount,
        COUNT(CASE WHEN status = 'SUBMITTED'    THEN 1 END)              AS submitted_count,
        COUNT(CASE WHEN status = 'APPROVED'     THEN 1 END)              AS approved_count,
        COUNT(CASE WHEN status = 'PAID'         THEN 1 END)              AS paid_count,
        COUNT(CASE WHEN status = 'REJECTED'     THEN 1 END)              AS rejected_count,
        COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END)              AS review_count
      FROM insurance_claims
    `);

    return NextResponse.json({
      success: true,
      data: claimsResult.rows,
      stats: statsResult.rows[0],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[insurance-claims GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insurance claims', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/insurance-claims
// Create a new claim from an invoice
export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    await ensureTable(pool);

    const body = await request.json();
    const {
      invoice_id,
      invoice_number,
      patient_id,
      patient_name,
      patient_name_ar,
      insurance_company_id,
      insurance_company_name,
      claim_amount,
      service_date,
      notes,
      authorization_number,
    } = body;

    if (!invoice_id || !insurance_company_id || !claim_amount) {
      return NextResponse.json(
        { error: 'invoice_id, insurance_company_id, and claim_amount are required' },
        { status: 400 }
      );
    }

    // Prevent duplicate claims for the same invoice
    const existing = await pool.query(
      `SELECT id, claim_number, status FROM insurance_claims WHERE invoice_id = $1 AND workspaceid = $2`,
      [invoice_id, workspaceId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error: 'A claim already exists for this invoice',
          existing: existing.rows[0],
        },
        { status: 409 }
      );
    }

    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    const claim_number = `CLM-${year}-${seq}`;
    const id = `claim-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await pool.query(`ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50)`).catch(() => {});

    const result = await pool.query(`
      INSERT INTO insurance_claims (
        id, claim_number, invoice_id, invoice_number,
        patient_id, patient_name, patient_name_ar,
        insurance_company_id, insurance_company_name,
        claim_amount, approved_amount, paid_amount,
        status, service_date, submission_date, notes, authorization_number,
        workspaceid
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10, 0, 0,
        'SUBMITTED', $11, CURRENT_DATE, $12, $13, $14
      )
      RETURNING *
    `, [
      id, claim_number, invoice_id, invoice_number || null,
      patient_id || null, patient_name || null, patient_name_ar || null,
      insurance_company_id, insurance_company_name || null,
      claim_amount,
      service_date || null,
      notes || null,
      authorization_number || null,
      workspaceId,
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST insurance-claims error:', error);
    return NextResponse.json({ error: 'Failed to create insurance claim' }, { status: 500 });
  }
}
