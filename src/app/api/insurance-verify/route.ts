/**
 * GET /api/insurance-verify?patient_id=X  (or ?policy_number=Y)
 * Coverage verification — returns a patient's active insurance policies with the
 * company's coverage %, plus a sample coverage calculation for a given amount.
 * Used at billing time to confirm what insurance will cover.
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
    const policyNumber = searchParams.get('policy_number');
    const amount = parseFloat(searchParams.get('amount') || '0') || 0;

    if (!patientId && !policyNumber) {
      return NextResponse.json({ error: 'patient_id or policy_number is required' }, { status: 400 });
    }

    let q = `
      SELECT
        pi.insuranceid      AS id,
        pi.patientid        AS patient_id,
        pi.insurancecompany AS company_name,
        pi.insurancenumber  AS policy_number,
        pi.company_id,
        ic.coverage_percentage,
        ic.company_code,
        ic.active           AS company_active
      FROM patient_insurance_information pi
      LEFT JOIN insurance_companies ic ON pi.company_id = ic.company_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;
    if (patientId)    { q += ` AND pi.patientid::text = $${idx++}`; params.push(patientId); }
    if (policyNumber) { q += ` AND pi.insurancenumber = $${idx++}`; params.push(policyNumber); }

    const r = await pool.query(q, params);

    const policies = r.rows.map((p) => {
      const pct = parseFloat(p.coverage_percentage) || 0;
      const covered = Math.round((amount * pct) / 100);
      return {
        ...p,
        coverage_percentage: pct,
        is_active: p.company_active !== false,
        sample_amount: amount,
        insurance_covers: amount > 0 ? covered : null,
        patient_pays: amount > 0 ? amount - covered : null,
      };
    });

    return NextResponse.json({
      success: true,
      verified: policies.length > 0,
      has_active_coverage: policies.some((p) => p.is_active),
      policy_count: policies.length,
      policies,
    });
  } catch (error) {
    console.error('[insurance-verify]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
