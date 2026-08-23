/**
 * /api/insurance-pre-approvals
 * Prior-authorization workflow for expensive procedures before billing.
 * GET  — list pre-approvals (?status= &patient_id=)
 * POST — request a pre-approval (status PENDING)
 * Uses insurance_pre_approvals table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


// cpt_codes / icd10_codes are Postgres array columns — convert "a, b" → ['a','b']
function toArr(v: any): string[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.map(String);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

async function ensureCompanyCol(p: Pool) {
  // company ids are VARCHAR (INS-001); the legacy insuranceid is UUID — add a
  // proper VARCHAR company_id column so we can link to insurance_companies.
  await p.query(`ALTER TABLE insurance_pre_approvals ADD COLUMN IF NOT EXISTS company_id VARCHAR(50)`).catch(() => {});
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    await ensureCompanyCol(pool);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patient_id');

    let q = `
      SELECT pa.*,
             ic.company_name,
             ic.contact_email   AS company_email,
             ic.contact_phone   AS company_phone,
             ic.coverage_percentage,
             p.firstname || ' ' || COALESCE(p.lastname,'') AS patient_name,
             p.nationalid       AS patient_national_id,
             p.phone            AS patient_phone
      FROM insurance_pre_approvals pa
      LEFT JOIN insurance_companies ic ON pa.company_id = ic.company_id
      LEFT JOIN patients p ON pa.patientid::text = p.patientid::text
      WHERE pa.workspaceid = $1
    `;
    const params: any[] = [workspaceId];
    let idx = 2;
    if (status)    { q += ` AND pa.status = $${idx++}`;            params.push(status); }
    if (patientId) { q += ` AND pa.patientid::text = $${idx++}`;  params.push(patientId); }
    q += ' ORDER BY pa.request_date DESC NULLS LAST, pa.createdat DESC';

    const r = await pool.query(q, params);
    return NextResponse.json({ success: true, data: r.rows, count: r.rows.length });
    });
  } catch (error) {
    console.error('[pre-approvals GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    await ensureCompanyCol(pool);
    const b = await request.json();
    if (!b.patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(b.patient_id));
    if (!isUuid) {
      return NextResponse.json({ error: 'Invalid patient — please select from search (name, national ID, or mobile)' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const authNumber = `PA-${year}-${rand}`;

    // company_id is VARCHAR ('INS-001') → use the new company_id column (not the UUID insuranceid)
    const r = await pool.query(
      `INSERT INTO insurance_pre_approvals
         (patientid, company_id, request_date, authorization_number, status,
          cpt_codes, icd10_codes, authorized_amount, clinical_justification,
          requested_services, workspaceid, createdat, updatedat)
       VALUES ($1,$2,CURRENT_DATE,$3,'PENDING',$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING preapprovalid AS id, authorization_number, status`,
      [
        b.patient_id, b.company_id || null, authNumber,
        toArr(b.cpt_codes), toArr(b.icd10_codes),
        b.authorized_amount || 0, b.clinical_justification || null,
        // requested_services is jsonb — store as a JSON object
        b.requested_services ? JSON.stringify({ description: b.requested_services }) : null,
        workspaceId,
      ]
    );
    return NextResponse.json({ success: true, data: r.rows[0] }, { status: 201 });
    });
  } catch (error) {
    console.error('[pre-approvals POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
