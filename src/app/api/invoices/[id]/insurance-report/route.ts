import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

/**
 * GET /api/invoices/[id]/insurance-report
 *
 * Returns all data needed to render a printable insurance claim report:
 *   - invoice (full row)
 *   - items (invoice_items)
 *   - patient (patients + patient_medical_information)
 *   - insuranceCompany (insurance_companies)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;

  // Reports expose patient and billing detail, so only for the caller's facility.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    // 1. Invoice
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceResult.rows[0];

    // 2. Invoice items
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat',
      [id]
    );

    // 3. Patient + medical info (patients table lives in the same DB)
    let patient: Record<string, any> | null = null;
    if (invoice.patient_id) {
      try {
        const patientResult = await pool.query(
          `SELECT
             p.patientid       AS id,
             p.ehrid           AS patient_number,
             p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname AS full_name,
             p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname AS full_name_ar,
             p.dateofbirth     AS date_of_birth,
             p.gender,
             p.nationalid      AS national_id,
             p.phone,
             p.bloodgroup      AS blood_group,
             p.email,
             p.address,
             med.allergies,
             med.chronicdiseases  AS chronic_diseases,
             med.currentmedications AS current_medications,
             med.medicalhistory   AS medical_history
           FROM patients p
           LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
           WHERE p.patientid = $1`,
          [invoice.patient_id]
        );
        if (patientResult.rows.length > 0) {
          patient = patientResult.rows[0];
        }
      } catch {
        // patients table may be in a different schema/DB — non-fatal
      }
    }

    // 4. Insurance company details
    // insurance_companies uses: company_id, company_name, company_code, contact_phone, address
    let insuranceCompany: Record<string, any> | null = null;
    if (invoice.insurance_company_id) {
      try {
        const insResult = await pool.query(
          `SELECT
             company_id        AS id,
             company_name      AS name,
             company_code      AS code,
             contact_phone     AS phone,
             address,
             contact_person,
             contact_email,
             coverage_percentage
           FROM insurance_companies
           WHERE company_id = $1`,
          [invoice.insurance_company_id]
        );
        if (insResult.rows.length > 0) insuranceCompany = insResult.rows[0];
      } catch {
        // table may not exist yet
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        items: itemsResult.rows,
        patient,
        insuranceCompany,
      },
    });
  } catch (error) {
    console.error('[insurance-report GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
