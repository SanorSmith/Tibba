/**
 * /api/patient-insurance
 * Patient insurance ENROLLMENT — uses the REAL table `patient_insurance_information`
 * (the populated one), not the empty duplicate `patient_insurance`.
 *
 * GET  — list policies (optional ?patient_id= &company_id=), joined with company + patient
 * POST — enroll a patient in an insurance policy
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const companyId = searchParams.get('company_id');

    let q = `
      SELECT
        pi.insuranceid        AS id,
        pi.patientid          AS patient_id,
        pi.insurancecompany   AS company_name,
        pi.insurancenumber    AS policy_number,
        pi.policytype         AS policy_type,
        pi.coveragedetails    AS coverage_details,
        pi.company_id,
        pi.createdat,
        pi.updatedat,
        ic.coverage_percentage,
        ic.company_code
      FROM patient_insurance_information pi
      LEFT JOIN insurance_companies ic ON pi.company_id = ic.company_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (patientId) { q += ` AND pi.patientid::text = $${idx++}`; params.push(patientId); }
    if (companyId) { q += ` AND pi.company_id = $${idx++}`; params.push(companyId); }
    q += ' ORDER BY pi.createdat DESC';

    const result = await pool.query(q, params);
    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('[patient-insurance GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const b = await request.json();
    if (!b.patient_id || !b.company_id) {
      return NextResponse.json({ error: 'patient_id and company_id are required' }, { status: 400 });
    }
    // patientid is a UUID — reject non-UUID input cleanly (instead of a 500 cast error)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(b.patient_id));
    if (!isUuid) {
      return NextResponse.json({ error: 'Invalid patient — please select a patient from search (by name, national ID, or mobile)' }, { status: 400 });
    }

    // Resolve company name + coverage from insurance_companies
    const comp = await pool.query(
      `SELECT company_name, coverage_percentage FROM insurance_companies WHERE company_id = $1`,
      [b.company_id]
    );
    const companyName = comp.rows[0]?.company_name || b.company_name || 'Unknown';
    const coverage = b.coverage_percentage ?? comp.rows[0]?.coverage_percentage ?? null;

    const result = await pool.query(
      `INSERT INTO patient_insurance_information
         (patientid, insurancecompany, insurancenumber, policytype, coveragedetails, company_id, createdat, updatedat)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       RETURNING insuranceid AS id`,
      [
        b.patient_id, companyName, b.policy_number || '', b.policy_type || null,
        JSON.stringify({ coverage_percentage: coverage, notes: b.notes || null }),
        b.company_id,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[patient-insurance POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
