import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session-token';
import { getWorkspaceId } from '@/lib/workspace';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, ShadingType, AlignmentType,
} from 'docx';
import { isOpenEHRConfigured, getEhrIdBySubject, getPatientOrders, getPatientDiagnoses } from '@/lib/openehr/client';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


// ── Layout constants (US Letter, 0.75" margins) ──────────────────────────
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1080; // 0.75in
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 10080

const BLUE = '0066CC';
const LIGHT_BLUE = 'E8F4FD';
const LABEL_BG = 'F0F4F8';
const BORDER = { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const fmtN = (n: unknown) => new Intl.NumberFormat('en-IQ').format(parseFloat(String(n ?? 0)) || 0);
const fmtD = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '-');

function sectionTitle(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(text)],
  });
}

/** A "Field | Details" two-column info table. Blank/undefined values render as a fillable line. */
function fieldTable(rows: [string, string | number | null | undefined][]) {
  const labelWidth = 3200;
  const valueWidth = CONTENT_WIDTH - labelWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: rows.map(([label, value]) => {
      const filled = value !== undefined && value !== null && String(value).trim() !== '';
      return new TableRow({
        children: [
          new TableCell({
            borders: BORDERS,
            width: { size: labelWidth, type: WidthType.DXA },
            shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
          }),
          new TableCell({
            borders: BORDERS,
            width: { size: valueWidth, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({
                text: filled ? String(value) : '_________________________',
                size: 18,
                color: filled ? undefined : '999999',
              })],
            })],
          }),
        ],
      });
    }),
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;

  // Reports expose patient and billing detail, so only for the caller's facility.
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(workspaceId, async () => {

  try {
    const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1 AND workspaceid = $2', [id, workspaceId]);
    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceResult.rows[0];

    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat',
      [id]
    );
    const items = itemsResult.rows;

    // Contact Email/Phone — whoever is generating this report, from the
    // login session cookie (set in /api/auth/login as base64 JSON containing
    // email). There's no phone captured at login, so best-effort match it
    // against a stakeholder record sharing the same email.
    let sessionEmail: string | null = null;
    let sessionPhone: string | null = null;
    try {
      const raw = request.cookies.get('tibbna_session')?.value;
      const session: any = await verifySession(raw);
      sessionEmail = session?.email || null;
    } catch { /* non-fatal — malformed/missing cookie */ }
    if (sessionEmail) {
      try {
        const r = await pool.query(
          `SELECT phone, mobile FROM stakeholders WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [sessionEmail]
        );
        if (r.rows.length > 0) sessionPhone = r.rows[0].phone || r.rows[0].mobile || null;
      } catch { /* non-fatal */ }
    }

    // Requesting Physician / Provider ID / Contact Phone — the receptionist's
    // chosen provider for a line is stored as invoice_items.stakeholder_id,
    // not a name/id/phone snapshot, so look up the actual stakeholder record.
    let requestingProvider: Record<string, any> | null = null;
    const stakeholderId = items.find((it: any) => it.stakeholder_id)?.stakeholder_id;
    if (stakeholderId) {
      try {
        const r = await pool.query(
          `SELECT id, stakeholder_code, name_en, name_ar, phone, mobile
           FROM stakeholders WHERE id = $1`,
          [stakeholderId]
        );
        if (r.rows.length > 0) requestingProvider = r.rows[0];
      } catch { /* non-fatal */ }
    }

    // Department — this report is always issued by Finance (it's a billing/
    // pre-approval document, not tied to whichever clinical department
    // performed the service), so it's fixed rather than derived from the
    // service catalog's department_id (which doesn't reliably map to real
    // department records anyway).
    const departmentName: string = 'Finance';

    let patient: Record<string, any> | null = null;
    if (invoice.patient_id) {
      try {
        const r = await pool.query(
          `SELECT
             p.patientid AS id, p.ehrid AS patient_number,
             p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname AS full_name,
             p.dateofbirth AS date_of_birth, p.gender, p.nationalid AS national_id,
             p.phone, p.bloodgroup AS blood_group, p.email, p.address,
             med.allergies, med.chronicdiseases AS chronic_diseases,
             med.currentmedications AS current_medications, med.medicalhistory AS medical_history
           FROM patients p
           LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
           WHERE p.patientid = $1`,
          [invoice.patient_id]
        );
        if (r.rows.length > 0) patient = r.rows[0];
      } catch { /* non-fatal */ }
    }

    let insuranceCompany: Record<string, any> | null = null;
    if (invoice.insurance_company_id) {
      try {
        const r = await pool.query(
          `SELECT company_id AS id, company_name AS name, company_code AS code,
                  contact_phone AS phone, address, contact_person, contact_email,
                  contract_start_date, contract_end_date
           FROM insurance_companies WHERE company_id = $1`,
          [invoice.insurance_company_id]
        );
        if (r.rows.length > 0) insuranceCompany = r.rows[0];
      } catch { /* non-fatal — contract_start_date/contract_end_date may not exist yet on older DBs */ }
    }

    // Patient's enrolled policy with this company — Policy Number comes from
    // here (set via Reception's insurance enrollment flow).
    let policy: Record<string, any> | null = null;
    if (invoice.patient_id && invoice.insurance_company_id) {
      try {
        const r = await pool.query(
          `SELECT insurancenumber AS policy_number, policytype AS coverage_type
           FROM patient_insurance_information
           WHERE patientid::text = $1 AND company_id = $2
           ORDER BY createdat DESC LIMIT 1`,
          [invoice.patient_id, invoice.insurance_company_id]
        );
        if (r.rows.length > 0) policy = r.rows[0];
      } catch { /* non-fatal */ }
    }

    const insPct = parseFloat(invoice.insurance_coverage_percentage) || 0;

    // Coverage Type: prefer the Insurance Category actually picked on the
    // invoice (matched by coverage %) — that's the value shown live in the
    // invoice's "Insurance Category" dropdown — falling back to whatever
    // policy type was set at patient enrollment.
    let coverageTypeLabel: string | null = policy?.coverage_type || null;
    if (invoice.insurance_company_id) {
      try {
        const r = await pool.query(
          `SELECT category_name FROM insurance_company_categories
           WHERE company_id = $1 AND coverage_percentage = $2
           LIMIT 1`,
          [invoice.insurance_company_id, insPct]
        );
        if (r.rows.length > 0) coverageTypeLabel = r.rows[0].category_name;
      } catch { /* non-fatal */ }
    }

    // Policy Effective/Expiration Date: prefer a real APPROVED pre-approval
    // for this patient + company (Finance → Insurance → Pre-Approvals tab) —
    // response_date is when it was approved (effective), expiration_date is
    // set by whoever approved it. Falls back to the company's contract dates.
    let policyEffectiveDate: string | null = insuranceCompany?.contract_start_date || null;
    let policyExpirationDate: string | null = insuranceCompany?.contract_end_date || null;
    if (invoice.patient_id && invoice.insurance_company_id) {
      try {
        const r = await pool.query(
          `SELECT response_date, expiration_date FROM insurance_pre_approvals
           WHERE patientid::text = $1 AND company_id = $2 AND status = 'APPROVED'
           ORDER BY response_date DESC NULLS LAST, updatedat DESC LIMIT 1`,
          [invoice.patient_id, invoice.insurance_company_id]
        );
        if (r.rows.length > 0) {
          if (r.rows[0].response_date) policyEffectiveDate = r.rows[0].response_date;
          if (r.rows[0].expiration_date) policyExpirationDate = r.rows[0].expiration_date;
        }
      } catch { /* non-fatal */ }
    }
    const age = patient?.date_of_birth
      ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
      : null;

    const requestId = `PA-${new Date().getFullYear()}-${invoice.invoice_number?.replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)}`;

    // ── Auto-fill Scheduled Date + Diagnosis Description from OpenEHR ────
    // Lines pulled via "Get Orders" carry openehr_source_uid; use it to look
    // up that order's requested/scheduled date. Diagnosis comes from the
    // patient's recorded EVALUATION.problem_diagnosis entries (excluding
    // vaccination records, which reuse the same slot with a marker prefix).
    // Only attempted when at least one line actually came from OpenEHR, and
    // bounded by a timeout — EHRbase can be slow/unreachable and must never
    // block report generation (report still downloads with blank fields).
    const scheduledDateBySourceUid = new Map<string, string>();
    let diagnosisText = '';
    const hasOpenEHRLinkedItems = items.some((it: any) => it.openehr_source_uid);
    if (hasOpenEHRLinkedItems && isOpenEHRConfigured() && patient?.national_id) {
      try {
        const withTimeout = <T,>(p: Promise<T>, ms: number) =>
          Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('OpenEHR lookup timed out')), ms))]);
        const ehrId = await withTimeout(getEhrIdBySubject(patient.national_id), 5000);
        if (ehrId) {
          const [orders, diagnoses] = await withTimeout(
            Promise.all([getPatientOrders(ehrId), getPatientDiagnoses(ehrId)]),
            15000
          );
          for (const o of orders) {
            if (o.source_uid && o.requested_date) scheduledDateBySourceUid.set(o.source_uid, o.requested_date);
          }
          diagnosisText = diagnoses
            .map(d => d.description ? `${d.name}: ${d.description}` : d.name)
            .join('; ');
        }
      } catch (e) {
        console.error('[insurance-report/docx] OpenEHR lookup failed (non-fatal):', e);
      }
    }

    // ── Requested Services (one field-table per line item) ──────────────
    const serviceSections = items.flatMap((item: any, i: number) => {
      const qty = item.quantity || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const total = parseFloat(item.total_price) || unitPrice * qty;
      const scheduledDate = item.openehr_source_uid ? scheduledDateBySourceUid.get(item.openehr_source_uid) : undefined;
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(`Service ${i + 1}: ${item.service_name || item.item_name || 'Service'}`)],
        }),
        fieldTable([
          ['CPT Code', null],
          ['Description', item.service_name || item.item_name],
          ['ICD-10 Diagnosis Code', null],
          ['Diagnosis Description', diagnosisText || null],
          ['Requested Quantity', `${qty} procedure${qty > 1 ? 's' : ''}`],
          ['Estimated Cost', `${fmtN(total)} IQD`],
          ['Facility', 'Tibbna Hospital'],
          ['Scheduled Date', scheduledDate ? fmtD(scheduledDate) : null],
          ['Urgency', null],
        ]),
        spacer(),
      ];
    });

    // ── Cost breakdown table ─────────────────────────────────────────────
    const costHeaderRow = new TableRow({
      tableHeader: true,
      children: ['Service', 'Estimated Cost', `Insurance Coverage (${insPct}%)`, 'Patient Responsibility'].map((h, i) =>
        new TableCell({
          borders: BORDERS,
          width: { size: [3960, 2040, 2040, 2040][i], type: WidthType.DXA },
          shading: { fill: BLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 16 })] })],
        })
      ),
    });
    const costRows = items.map((item: any) => {
      const qty = item.quantity || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const total = parseFloat(item.total_price) || unitPrice * qty;
      const insCovered = Math.round(total * insPct / 100);
      const patPays = total - insCovered;
      const cells = [item.service_name || item.item_name || '-', `${fmtN(total)} IQD`, `${fmtN(insCovered)} IQD`, `${fmtN(patPays)} IQD`];
      return new TableRow({
        children: cells.map((c, i) =>
          new TableCell({
            borders: BORDERS,
            width: { size: [3960, 2040, 2040, 2040][i], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [new TextRun({ text: c, size: 18 })],
            })],
          })
        ),
      });
    });
    const totalInsCovered = Math.round((parseFloat(invoice.total_amount) || 0) * insPct / 100);
    const totalPatResp = (parseFloat(invoice.total_amount) || 0) - totalInsCovered;
    const totalRow = new TableRow({
      children: ['Total Estimated', `${fmtN(invoice.total_amount)} IQD`, `${fmtN(totalInsCovered)} IQD`, `${fmtN(totalPatResp)} IQD`].map((c, i) =>
        new TableCell({
          borders: BORDERS,
          width: { size: [3960, 2040, 2040, 2040][i], type: WidthType.DXA },
          shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: c, bold: true, size: 18 })],
          })],
        })
      ),
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 20 } } },
        paragraphStyles: [
          {
            id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 32, bold: true, font: 'Arial', color: BLUE },
            paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 },
          },
          {
            id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 22, bold: true, font: 'Arial', color: BLUE },
            paragraph: {
              spacing: { before: 260, after: 120 },
              outlineLevel: 1,
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 2 } },
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Insurance Pre-Approval Request Report')] }),
          new Paragraph({ children: [new TextRun({ text: 'Tibbna Hospital — Healthcare Management System', size: 18, color: '888888' })], spacing: { after: 200 } }),

          sectionTitle('Pre-Approval Request Details'),
          fieldTable([
            ['Request ID', requestId],
            ['Date Submitted', new Date().toLocaleDateString('en-GB')],
            ['Status', 'Pending Review'],
            ['Priority', 'Standard'],
          ]),
          spacer(),

          sectionTitle('Patient Information'),
          fieldTable([
            ['Patient Name', patient?.full_name || invoice.patient_name],
            ['Patient ID', invoice.patient_id],
            ['Date of Birth', patient?.date_of_birth ? `${fmtD(patient.date_of_birth)}${age !== null ? ` (${age} years old)` : ''}` : null],
            ['Gender', patient?.gender],
            ['Phone', patient?.phone],
            ['Address', patient?.address],
          ]),
          spacer(),

          sectionTitle('Insurance Information'),
          fieldTable([
            ['Insurance Company', insuranceCompany?.name],
            ['Policy Number', policy?.policy_number],
            ['Group Number', null],
            ['Policy Holder', patient?.full_name || invoice.patient_name],
            ['Coverage Type', coverageTypeLabel],
            ['Coverage Percentage', insPct ? `${insPct}%` : null],
            ['Policy Effective Date', policyEffectiveDate ? fmtD(policyEffectiveDate) : null],
            ['Policy Expiration Date', policyExpirationDate ? fmtD(policyExpirationDate) : null],
            ['Primary Insurance', insuranceCompany?.name],
          ]),
          spacer(),

          sectionTitle('Requesting Provider Information'),
          fieldTable([
            ['Provider Name', 'Tibbna Hospital'],
            ['Provider ID', requestingProvider?.stakeholder_code],
            ['Department', departmentName],
            ['Requesting Physician', requestingProvider?.name_en || requestingProvider?.name_ar],
            ['Physician NPI', null],
            ['Contact Phone', sessionPhone || requestingProvider?.phone || requestingProvider?.mobile],
            ['Contact Email', sessionEmail],
          ]),
          spacer(),

          sectionTitle('Requested Services'),
          ...serviceSections,

          sectionTitle('Clinical Justification'),
          fieldTable([
            ['Medical History', patient?.medical_history],
            ['Chronic Diseases', patient?.chronic_diseases],
            ['Allergies', patient?.allergies],
            ['Current Medications', patient?.current_medications],
            ['Family History', null],
            ['Current Symptoms', null],
            ['Diagnostic Findings', null],
            ['Medical Necessity', null],
            ['Alternative Treatments Considered', null],
            ['Conservative Treatments Tried', null],
          ]),
          spacer(),

          sectionTitle('Supporting Documentation'),
          new Paragraph({ children: [new TextRun({ text: 'Attached documents (to be listed by submitting clinician):', size: 18, italics: true })] }),
          new Paragraph({ children: [new TextRun('☐ Clinical Notes    ☐ Diagnostic Reports    ☐ Laboratory Results    ☐ Previous Medical Records')], spacing: { before: 80, after: 200 } }),

          sectionTitle('Cost Breakdown'),
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [3960, 2040, 2040, 2040],
            rows: [costHeaderRow, ...costRows, totalRow],
          }),
          new Paragraph({ children: [new TextRun({ text: 'Note: Actual costs may vary based on facility charges and insurance company fee schedule.', size: 16, italics: true, color: '888888' })], spacing: { before: 100, after: 200 } }),

          sectionTitle('Request Timeline'),
          fieldTable([
            ['Request Submitted', new Date().toLocaleDateString('en-GB')],
            ['Expected Review Time', '3-5 business days'],
            ['Requested Service Date', null],
            ['Authorization Expiration', null],
          ]),
          spacer(),

          sectionTitle('Special Considerations'),
          fieldTable([
            ['Urgency', null],
            ['Risk Factors', patient?.allergies || patient?.chronic_diseases ? [patient?.chronic_diseases, patient?.allergies].filter(Boolean).join('; ') : null],
            ['Comorbidities', patient?.chronic_diseases],
            ['Work Status', null],
          ]),
          spacer(),

          sectionTitle('Provider Certification'),
          new Paragraph({
            children: [new TextRun({
              text: "I certify that the requested services are medically necessary for the treatment of this patient’s condition. The information provided is accurate and complete to the best of my knowledge.",
              size: 18,
            })],
            spacing: { after: 160 },
          }),
          fieldTable([
            ['Physician Signature', null],
            ['Specialty', null],
            ['License Number', null],
            ['Date', new Date().toLocaleDateString('en-GB')],
          ]),
          spacer(),

          sectionTitle('Hospital Authorization'),
          new Paragraph({ children: [new TextRun({ text: 'This pre-approval request has been reviewed and approved for submission by the hospital administration.', size: 18 })], spacing: { after: 160 } }),
          fieldTable([
            ['Hospital Administrator Signature', null],
            ['Name', null],
            ['Title', null],
            ['Date', new Date().toLocaleDateString('en-GB')],
          ]),
          spacer(),

          sectionTitle('Insurance Company Response'),
          new Paragraph({ children: [new TextRun({ text: 'To be completed by insurance company', size: 18, italics: true })], spacing: { after: 120 } }),
          fieldTable([
            ['Decision', '☐ Approved   ☐ Approved with Conditions   ☐ Denied   ☐ Pending Additional Information'],
            ['Authorization Number', null],
            ['Authorized Amount', null],
            ['Authorization Expiration Date', null],
            ['Conditions (if applicable)', null],
            ['Denial Reason (if denied)', null],
            ['Can Appeal', '☐ Yes   ☐ No'],
            ['Appeal Deadline', null],
            ['Reviewer Name', null],
            ['Reviewer ID', null],
            ['Review Date', null],
            ['Signature', null],
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Insurance_PreApproval_${invoice.invoice_number}.docx"`,
      },
    });
  } catch (error) {
    console.error('[insurance-report/docx GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', detail: (error as Error).message },
      { status: 500 }
    );
  }
  });
}
