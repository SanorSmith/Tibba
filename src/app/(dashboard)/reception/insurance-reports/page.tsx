'use client';

/**
 * Insurance reports, found by the patient rather than by the invoice.
 *
 * The pre-approval report already existed, as a small purple printer icon on
 * whichever row of Customer Billing happened to belong to that patient. That
 * works if you are already looking at the invoice. It does not work when
 * someone is standing at the desk, or the insurer is on the phone asking about
 * a national ID, because then you are paging through every invoice the
 * facility has ever issued looking for a name.
 *
 * So this asks the question the other way round. Name the person, get their
 * reports, and act on one.
 *
 * Three things to search by, because three different people ask: reception has
 * the patient in front of them and types a name, the insurer quotes a national
 * ID, and finance is holding an invoice number.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Printer,
  FileDown,
  Mail,
  ShieldCheck,
  FileSearch,
} from 'lucide-react';

type Row = {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | null;
  insurance_coverage_amount: string | null;
  insurance_coverage_percentage: string | null;
  patient_responsibility: string | null;
  status: string | null;
  authorization_number: string | null;
  patient_name: string;
  patient_name_ar: string | null;
  patient_id: string | null;
  national_id: string | null;
  patient_number: string | null;
  phone: string | null;
  company_name: string | null;
  company_code: string | null;
};

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0';
};

const shownDate = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export default function InsuranceReportsPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');
  // A failed search is not an empty result. Collapsing the two is how "you are
  // not signed in" renders as "this patient has no reports", which is the same
  // mistake the delete button used to make.
  const [failed, setFailed] = useState<string | null>(null);

  // Typing, not clicking. Someone reading a national ID off a card should not
  // have to find the button afterwards. Debounced so the database is not asked
  // a question per keystroke.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRows(null);
      setSearched('');
      setFailed(null);
      return;
    }

    let live = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/insurance-reports/search?q=${encodeURIComponent(term)}`);
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (res.status === 401) {
          throw new Error('Your session has expired. Sign in again.');
        }
        if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
        setFailed(null);
        setRows(data.results ?? []);
        setSearched(term);
      } catch (e) {
        if (live) {
          const message = e instanceof Error ? e.message : 'Could not search';
          toast.error(message);
          setFailed(message);
          setRows([]);
        }
      } finally {
        if (live) setLoading(false);
      }
    }, 300);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  // One patient usually has several invoices, and the person asking thinks in
  // people rather than in invoices. Grouping keeps a patient's reports
  // together instead of interleaving them with a namesake's.
  const groups = useMemo(() => {
    if (!rows) return [];
    const byPatient = new Map<string, { label: string; nationalId: string | null; rows: Row[] }>();
    for (const r of rows) {
      const key = r.patient_id || r.patient_name;
      if (!byPatient.has(key)) {
        byPatient.set(key, {
          label: r.patient_name,
          nationalId: r.national_id,
          rows: [],
        });
      }
      byPatient.get(key)!.rows.push(r);
    }
    return [...byPatient.values()];
  }, [rows]);

  const downloadWord = async (row: Row) => {
    try {
      toast.info('Generating the Word report…');
      const res = await fetch(`/api/invoices/${row.id}/insurance-report/docx`);
      if (!res.ok) throw new Error('Could not generate the report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Insurance_PreApproval_${row.invoice_number ?? row.id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate the report');
    }
  };

  /**
   * Open a mail draft, addressed and worded, for the person to attach the PDF.
   *
   * Not a server-side send, because this deployment has no mail server: there
   * is no SMTP configuration and nodemailer is not installed, so a Send button
   * would silently do nothing. This opens the desk's own mail client with the
   * insurer's address and the invoice number already filled in, which is the
   * honest version of the same job. Save the PDF from the print view first and
   * attach it.
   */
  const emailDraft = (row: Row) => {
    const subject = `Insurance pre-approval request — invoice ${row.invoice_number ?? ''}`;
    const body = [
      `Dear ${row.company_name ?? 'Sir or Madam'},`,
      '',
      `Please find attached a pre-approval request for our patient ${row.patient_name}` +
        (row.national_id ? ` (national ID ${row.national_id})` : '') +
        '.',
      '',
      `Invoice: ${row.invoice_number ?? '—'}`,
      `Date: ${shownDate(row.invoice_date)}`,
      `Total: ${money(row.total_amount)} IQD`,
      `Requested from insurance: ${money(row.insurance_coverage_amount)} IQD`,
      '',
      'Kind regards,',
      'Tibbna Hospital',
    ].join('\n');

    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.info('Attach the PDF you saved from the print view.');
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Insurance Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-2xl">
          Find a patient, then print, download or email their insurance
          pre-approval report. Only invoices that carry an insurance company
          appear here &mdash; an invoice with no insurer has no claim to make.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus
          className="tibbna-input w-full pl-9"
          placeholder="Patient name, national ID, or invoice number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {rows === null ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <FileSearch className="mx-auto w-7 h-7 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Type at least two characters to search.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            The whole facility&rsquo;s billing history is not an answer to
            &ldquo;which reports belong to this person&rdquo;, so nothing is
            listed until you ask.
          </p>
        </div>
      ) : failed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800">{failed}</p>
          <p className="mt-1 text-xs text-red-700">
            Nothing was searched, so this is not the same as finding nothing.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-600">
            No insurance report matches &ldquo;{searched}&rdquo;.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            The patient may have invoices with no insurance company on them.
            Those carry no report.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-gray-500">
            {rows.length} report{rows.length === 1 ? '' : 's'} for{' '}
            {groups.length} patient{groups.length === 1 ? '' : 's'}.
          </p>

          {groups.map((g) => (
            <div key={g.label + (g.nationalId ?? '')} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <span className="font-semibold text-gray-900">{g.label}</span>
                {g.nationalId && (
                  <span className="text-xs text-gray-500">National ID {g.nationalId}</span>
                )}
                <span className="text-xs text-gray-400">
                  {g.rows.length} report{g.rows.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-medium">Invoice</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Insurance company</th>
                      <th className="px-4 py-2 font-medium text-right">Total</th>
                      <th className="px-4 py-2 font-medium text-right">Covered</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium text-right">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {r.invoice_number ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{shownDate(r.invoice_date)}</td>
                        <td className="px-4 py-2.5 text-gray-700">{r.company_name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          {money(r.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          {money(r.insurance_coverage_amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600">
                            {r.status ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/reception/insurance-reports/${r.id}/print`}
                              className="p-1.5 rounded hover:bg-purple-50"
                              title="Open the report to print it, or save it as a PDF"
                            >
                              <Printer className="w-4 h-4 text-purple-600" />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadWord(r)}
                              className="p-1.5 rounded hover:bg-gray-100"
                              title="Download the report as a Word document"
                            >
                              <FileDown className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => emailDraft(r)}
                              className="p-1.5 rounded hover:bg-blue-50"
                              title="Open an email draft for the insurer. Attach the PDF you saved from the print view."
                            >
                              <Mail className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
