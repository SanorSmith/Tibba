'use client';

/**
 * The pre-approval report, on screen and on paper.
 *
 * The Word download has existed for a while and remains the authority on what
 * this document says - if the two ever disagree, the .docx route is right.
 * This exists because a browser cannot print a .docx, and "print it" and "send
 * the PDF" were both asked for. The browser's own print dialog does both:
 * print on paper, or save as PDF to get a file to attach to an email.
 *
 * Deliberately plain. It is a claim form going to an insurer, not a screen.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer, ArrowLeft, FileDown } from 'lucide-react';

type Report = {
  invoice: Record<string, any>;
  items: Record<string, any>[];
  patient: Record<string, any> | null;
  insuranceCompany: Record<string, any> | null;
};

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0';
};

const shownDate = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/** A label and its value. The caller drops rows with nothing to say. */
function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12 }}>
      <span style={{ minWidth: 160, color: '#555' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{String(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18, breakInside: 'avoid' }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          borderBottom: '1px solid #333',
          paddingBottom: 3,
          marginBottom: 6,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function InsuranceReportPrintPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}/insurance-report`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Could not load the report (${r.status})`);
        }
        return r.json();
      })
      .then((d) => setReport(d.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the report'));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: '#b91c1c', fontSize: 14 }}>{error}</p>
        <a href="/reception/insurance-reports" style={{ fontSize: 13, color: '#2563eb' }}>
          Back to insurance reports
        </a>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, color: '#666' }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading the report&hellip;
      </div>
    );
  }

  const { invoice, items, patient, insuranceCompany } = report;
  const pct = Number(invoice.insurance_coverage_percentage ?? 0);
  const covered = Number(invoice.insurance_coverage_amount ?? 0);
  const total = Number(invoice.total_amount ?? 0);

  // Derived when the column is empty rather than trusted blindly: older
  // invoices left it null, and a null here reads as "the patient owes
  // nothing", which is the wrong direction for this number to be wrong in.
  const owed =
    invoice.patient_responsibility != null && invoice.patient_responsibility !== ''
      ? Number(invoice.patient_responsibility)
      : Math.max(total - covered, 0);

  const hasClinical =
    patient?.allergies ||
    patient?.chronic_diseases ||
    patient?.current_medications ||
    patient?.medical_history;

  return (
    <>
      {/* The toolbar is for the person at the screen. Paper carries only the
          document itself. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 12,
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <a
          href="/reception/insurance-reports"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#374151',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </a>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#7c3aed',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Printer className="w-4 h-4" />
          Print or save as PDF
        </button>
        <a
          href={`/api/invoices/${id}/insurance-report/docx`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 13,
            color: '#374151',
            textDecoration: 'none',
          }}
        >
          <FileDown className="w-4 h-4" />
          Word
        </a>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, background: '#fff', color: '#111' }}>
        <header style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Insurance Pre-Approval Request
          </h1>
          <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>
            Tibbna Hospital &mdash; Healthcare Management System
          </p>
        </header>

        <Section title="Request">
          <Field label="Invoice number" value={invoice.invoice_number ?? '—'} />
          <Field label="Invoice date" value={shownDate(invoice.invoice_date)} />
          <Field label="Status" value={invoice.status ?? '—'} />
          {invoice.authorization_number ? (
            <Field label="Authorisation number" value={invoice.authorization_number} />
          ) : null}
        </Section>

        <Section title="Patient">
          <Field label="Name" value={patient?.full_name || invoice.patient_name || '—'} />
          {patient?.national_id ? <Field label="National ID" value={patient.national_id} /> : null}
          {patient?.patient_number ? (
            <Field label="Patient number" value={patient.patient_number} />
          ) : null}
          {patient?.date_of_birth ? (
            <Field label="Date of birth" value={shownDate(patient.date_of_birth)} />
          ) : null}
          {patient?.gender ? <Field label="Gender" value={patient.gender} /> : null}
          {patient?.phone ? <Field label="Phone" value={patient.phone} /> : null}
          {patient?.address ? <Field label="Address" value={patient.address} /> : null}
        </Section>

        <Section title="Insurance">
          <Field label="Company" value={insuranceCompany?.name ?? '—'} />
          {insuranceCompany?.code ? <Field label="Company code" value={insuranceCompany.code} /> : null}
          {insuranceCompany?.contact_email ? (
            <Field label="Company email" value={insuranceCompany.contact_email} />
          ) : null}
          <Field label="Policy holder" value={patient?.full_name || invoice.patient_name || '—'} />
          <Field label="Coverage" value={`${pct}%`} />
        </Section>

        {hasClinical ? (
          <Section title="Clinical">
            {patient?.allergies ? <Field label="Allergies" value={patient.allergies} /> : null}
            {patient?.chronic_diseases ? (
              <Field label="Chronic diseases" value={patient.chronic_diseases} />
            ) : null}
            {patient?.current_medications ? (
              <Field label="Current medications" value={patient.current_medications} />
            ) : null}
            {patient?.medical_history ? (
              <Field label="Medical history" value={patient.medical_history} />
            ) : null}
          </Section>
        ) : null}

        <Section title="Services requested">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '5px 6px', border: '1px solid #d1d5db' }}>
                  Service
                </th>
                <th style={{ textAlign: 'right', padding: '5px 6px', border: '1px solid #d1d5db', width: 60 }}>
                  Qty
                </th>
                <th style={{ textAlign: 'right', padding: '5px 6px', border: '1px solid #d1d5db', width: 110 }}>
                  Unit
                </th>
                <th style={{ textAlign: 'right', padding: '5px 6px', border: '1px solid #d1d5db', width: 120 }}>
                  Total (IQD)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: 10, textAlign: 'center', color: '#666', border: '1px solid #d1d5db' }}
                  >
                    No itemised services on this invoice.
                  </td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={it.id ?? i}>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db' }}>
                      {it.service_name || it.service_name_ar || '—'}
                    </td>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right' }}>
                      {it.quantity ?? 1}
                    </td>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right' }}>
                      {money(it.unit_price)}
                    </td>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right' }}>
                      {money(it.total_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="Costs">
          <Field label="Total" value={`${money(total)} IQD`} />
          <Field label={`Insurance covers (${pct}%)`} value={`${money(covered)} IQD`} />
          <Field label="Patient responsibility" value={`${money(owed)} IQD`} />
          <p style={{ fontSize: 10, color: '#777', fontStyle: 'italic', marginTop: 6 }}>
            Actual costs may vary with facility charges and the insurer&rsquo;s fee schedule.
          </p>
        </Section>

        <Section title="To be completed by the insurance company">
          {['Decision', 'Approval number', 'Approved amount', 'Valid until', 'Signature and stamp'].map(
            (l) => (
              <div
                key={l}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '9px 0', fontSize: 12 }}
              >
                <span style={{ minWidth: 160, color: '#555' }}>{l}</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #999', height: 16 }} />
              </div>
            ),
          )}
        </Section>
      </div>
    </>
  );
}
