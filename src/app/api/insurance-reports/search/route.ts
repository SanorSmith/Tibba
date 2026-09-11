/**
 * Find the insurance reports belonging to one person.
 *
 * The pre-approval report has always existed, but only as a small printer icon
 * on whichever row of Customer Billing happened to be that patient's. Finding
 * every report for one person meant paging through every invoice the facility
 * has ever issued and recognising the name. This asks the question the other
 * way round: name the patient, get their reports.
 *
 * Three ways to name them, because three different people ask. Reception has
 * the patient in front of them and types a name. The insurer rings about a
 * national ID. Finance is holding an invoice number.
 *
 * Only invoices that actually carry an insurance company are returned. The
 * report is a claim against an insurer, so an invoice with no insurer has no
 * report to print, and offering one would produce a document with the payer
 * left blank.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Reports carry patient and billing detail, so this is scoped to the
  // caller's facility like every other read of invoices.
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();

  // An empty search returns nothing rather than everything. This screen exists
  // to answer "which reports belong to this person", and a facility's entire
  // insured billing history is not an answer to that.
  if (q.length < 2) {
    return NextResponse.json({ success: true, results: [], count: 0 });
  }

  return await withTenant(workspaceId, async () => {
    try {
      const term = `%${q}%`;

      const result = await pool.query(
        `SELECT i.id,
                i.invoice_number,
                i.invoice_date,
                i.total_amount,
                i.insurance_coverage_amount,
                i.insurance_coverage_percentage,
                i.patient_responsibility,
                i.status,
                i.authorization_number,
                coalesce(nullif(trim(i.patient_name), ''), 'Unnamed') AS patient_name,
                i.patient_name_ar,
                i.patient_id,
                p.nationalid   AS national_id,
                p.ehrid        AS patient_number,
                p.phone,
                ic.company_name,
                ic.company_code
           FROM invoices i
           -- patients.patientid is a uuid and invoices.patient_id is varchar,
           -- so the join needs a cast. The uuid is cast to text rather than
           -- the text to uuid: an invoice carrying anything that is not a
           -- uuid then simply fails to match, instead of aborting the whole
           -- search with a cast error.
           LEFT JOIN patients p ON p.patientid::text = i.patient_id
           LEFT JOIN insurance_companies ic
                  ON ic.company_id = i.insurance_company_id
          WHERE i.workspaceid = $1
            -- An empty string is not a company. The billing screens treat it
            -- as "no insurer" already, and the row it produced had a blank
            -- payer on the printed report.
            AND coalesce(i.insurance_company_id, '') <> ''
            AND (
                  i.patient_name      ILIKE $2
               OR i.patient_name_ar   ILIKE $2
               OR i.invoice_number    ILIKE $2
               OR p.nationalid        ILIKE $2
               OR p.ehrid             ILIKE $2
               OR (p.firstname || ' ' || coalesce(p.middlename || ' ', '') || p.lastname) ILIKE $2
            )
          ORDER BY i.invoice_date DESC NULLS LAST, i.invoice_number DESC
          LIMIT 200`,
        [workspaceId, term],
      );

      return NextResponse.json({
        success: true,
        results: result.rows,
        count: result.rowCount,
      });
    } catch (error) {
      console.error('[insurance-reports/search] failed:', error);
      return NextResponse.json(
        { error: 'Could not search insurance reports' },
        { status: 500 },
      );
    }
  });
}
