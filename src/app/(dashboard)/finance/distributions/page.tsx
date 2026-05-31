'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, DollarSign, Clock, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, CreditCard, Search, Filter, Eye, X, AlertCircle, Printer,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── types ─────────────────────────────────────────────────────────── */
interface StakeholderSummary {
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_name_en: string;
  stakeholder_role: string;
  mobile: string;
  bank_name_ar: string;
  account_number: string;
  shares_count: number;
  total_amount: string;
  pending_amount: string;
  paid_amount: string;
  pending_count: number;
  paid_count: number;
}

interface ShareDetail {
  id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  service_id: string;
  share_type: string;
  share_percentage: string;
  share_amount: string;
  payment_status: string;
  payment_date: string | null;
  notes: string | null;
  createdat: string;
}

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

const statusBadge = (status: string) => {
  if (status === 'PAID')
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'PENDING')
    return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

/* ─── component ─────────────────────────────────────────────────────── */
export default function DistributionsPage() {
  const [summaries, setSummaries] = useState<StakeholderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0 });

  // Filters
  const [search, setSearch]     = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Detail drawer
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails]       = useState<ShareDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Pay modal
  const [payTarget, setPayTarget] = useState<StakeholderSummary | null>(null);
  const [payDate, setPayDate]     = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes]   = useState('');
  const [paying, setPaying]       = useState(false);
  const [payError, setPayError]   = useState('');

  /* ── load summary ── */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = new URLSearchParams();
      if (filterStatus) p.set('status', filterStatus);
      if (fromDate)     p.set('from', fromDate);
      if (toDate)       p.set('to', toDate);
      const res = await fetch(`/api/distributions?${p}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setSummaries(data.data ?? []);
      setTotals(data.totals ?? { pending: 0, paid: 0, total: 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, fromDate, toDate]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  /* ── load detail rows ── */
  const toggleDetail = async (stkId: string) => {
    if (expandedId === stkId) { setExpandedId(null); return; }
    setExpandedId(stkId);
    setLoadingDetails(true);
    try {
      const p = new URLSearchParams({ view: 'detail', stakeholder_id: stkId });
      if (fromDate) p.set('from', fromDate);
      if (toDate)   p.set('to', toDate);
      const res = await fetch(`/api/distributions?${p}`);
      const data = await res.json();
      setDetails(data.data ?? []);
    } catch {
      setDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  /* ── pay all pending ── */
  const handlePay = async () => {
    if (!payTarget) return;
    setPaying(true);
    setPayError('');
    try {
      const res = await fetch('/api/distributions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: payTarget.stakeholder_id,
          payment_date: payDate,
          notes: payNotes || null,
          create_distribution: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Payment failed');
      const name = payTarget.stakeholder_name;
      toast.success(
        `Paid ${fmt(data.total_paid)} IQD to ${name} · ${data.paid_count} share${data.paid_count !== 1 ? 's' : ''} · posted to GL`
      );
      setPayTarget(null);
      setPayNotes('');
      loadSummary();
      if (expandedId === payTarget.stakeholder_id) {
        toggleDetail(payTarget.stakeholder_id);
      }
    } catch (e: any) {
      setPayError(e.message);
      toast.error('Payment failed: ' + e.message);
    } finally {
      setPaying(false);
    }
  };

  /* ── print a stakeholder payment statement (PDF) for the selected period ── */
  const printStatement = async (stk: StakeholderSummary) => {
    try {
      const p = new URLSearchParams({ view: 'detail', stakeholder_id: stk.stakeholder_id });
      if (fromDate) p.set('from', fromDate);
      if (toDate)   p.set('to', toDate);
      const res = await fetch(`/api/distributions?${p}`);
      const data = await res.json();
      const rows: ShareDetail[] = data.data ?? [];
      const periodLabel =
        fromDate || toDate
          ? `${fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '…'} → ${toDate ? new Date(toDate).toLocaleDateString('en-GB') : '…'}`
          : 'All time';
      const paid    = rows.filter(r => r.payment_status === 'PAID');
      const pending = rows.filter(r => r.payment_status === 'PENDING');
      const sum = (arr: ShareDetail[]) => arr.reduce((s, r) => s + parseFloat(r.share_amount || '0'), 0);
      const rowHtml = (r: ShareDetail) => `
        <tr>
          <td>${r.invoice_number || '—'}</td>
          <td>${r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-GB') : '—'}</td>
          <td>${r.patient_name || '—'}</td>
          <td style="text-align:right">${r.share_type === 'PERCENTAGE' ? parseFloat(r.share_percentage || '0').toFixed(1) + '%' : 'Fixed'}</td>
          <td style="text-align:right">${fmt(r.share_amount)} IQD</td>
          <td>${r.payment_status}${r.payment_date ? ' · ' + new Date(r.payment_date).toLocaleDateString('en-GB') : ''}</td>
        </tr>`;
      const w = window.open('', '_blank');
      if (!w) { toast.error('Pop-up blocked — allow pop-ups to print'); return; }
      w.document.write(`
        <html><head><title>Provider Statement — ${stk.stakeholder_name}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#111}
          h1{font-size:20px;margin:0}.sub{color:#666;font-size:13px;margin-top:4px}
          .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px}
          table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
          th,td{border-bottom:1px solid #e5e7eb;padding:6px 8px;text-align:left}
          th{background:#f1f5f9;font-size:11px;color:#475569}
          .tot{font-weight:bold;font-size:14px}
          .sec{margin-top:24px;font-weight:bold;font-size:14px}
          .right{text-align:right}
        </style></head><body>
        <h1>Provider Payment Statement</h1>
        <div class="sub">Tibbna Hospital — generated ${new Date().toLocaleDateString('en-GB')}</div>
        <div class="box">
          <b>${stk.stakeholder_name}</b> (${stk.stakeholder_role || '—'})${stk.mobile ? ' · ' + stk.mobile : ''}<br/>
          ${stk.bank_name_ar ? 'Bank: ' + stk.bank_name_ar + (stk.account_number ? ' · A/C: ' + stk.account_number : '') + '<br/>' : ''}
          Period: <b>${periodLabel}</b>
        </div>
        <div class="sec">Paid (${paid.length})</div>
        <table><thead><tr><th>Invoice</th><th>Date</th><th>Patient</th><th class="right">Share</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${paid.map(rowHtml).join('') || '<tr><td colspan=6 style="color:#999">None</td></tr>'}</tbody>
        <tfoot><tr><td colspan=4 class="right tot">Total Paid:</td><td class="right tot">${fmt(sum(paid))} IQD</td><td></td></tr></tfoot>
        </table>
        <div class="sec">Pending (${pending.length})</div>
        <table><thead><tr><th>Invoice</th><th>Date</th><th>Patient</th><th class="right">Share</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${pending.map(rowHtml).join('') || '<tr><td colspan=6 style="color:#999">None</td></tr>'}</tbody>
        <tfoot><tr><td colspan=4 class="right tot">Total Pending:</td><td class="right tot">${fmt(sum(pending))} IQD</td><td></td></tr></tfoot>
        </table>
        <p style="margin-top:32px;font-size:12px">Signature: ____________________________ &nbsp;&nbsp; Date: ____________</p>
        <script>window.onload=function(){window.print();}</script>
        </body></html>`);
      w.document.close();
    } catch (e: any) {
      toast.error('Could not generate statement: ' + e.message);
    }
  };

  /* ── filtered list ── */
  const filtered = summaries.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.stakeholder_name?.toLowerCase().includes(q) ||
      s.stakeholder_name_en?.toLowerCase().includes(q) ||
      s.stakeholder_role?.toLowerCase().includes(q)
    );
  });

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profit Distributions</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track and pay stakeholder shares from invoiced services
          </p>
        </div>
        <button
          onClick={loadSummary}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending Payout</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(totals.pending)} IQD</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Paid Out</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totals.paid)} IQD</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">All-time Total</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(totals.total)} IQD</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 mb-1 block">Search stakeholder</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or role..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">To</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(fromDate || toDate || filterStatus) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setFilterStatus(''); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 mt-4"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Stakeholders ({filtered.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading distributions…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'No stakeholders match your search.' : 'No distribution data yet. Add service providers and create invoices.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(stk => (
              <div key={stk.stakeholder_id}>
                {/* Summary row */}
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Name / role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{stk.stakeholder_name}</p>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 shrink-0">
                          {stk.stakeholder_role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {stk.stakeholder_name_en}
                        {stk.mobile && ` · ${stk.mobile}`}
                        {stk.bank_name_ar && ` · ${stk.bank_name_ar}`}
                        {stk.account_number && ` · ${stk.account_number}`}
                      </p>
                    </div>

                    {/* Amounts */}
                    <div className="flex gap-6 items-center shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Pending</p>
                        <p className="font-bold text-amber-600 text-sm">{fmt(stk.pending_amount)} IQD</p>
                        <p className="text-xs text-gray-400">{stk.pending_count} share{stk.pending_count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="font-bold text-emerald-600 text-sm">{fmt(stk.paid_amount)} IQD</p>
                        <p className="text-xs text-gray-400">{stk.paid_count} share{stk.paid_count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="font-bold text-gray-700 text-sm">{fmt(stk.total_amount)} IQD</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {parseFloat(stk.pending_amount) > 0 && (
                        <button
                          onClick={() => { setPayTarget(stk); setPayError(''); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay {fmt(stk.pending_amount)}
                        </button>
                      )}
                      <button
                        onClick={() => printStatement(stk)}
                        title="Print payment statement (PDF) for the selected period"
                        className="flex items-center gap-1 px-3 py-1.5 border text-xs rounded-lg hover:bg-gray-50 text-gray-600"
                      >
                        <Printer className="w-3.5 h-3.5" /> Statement
                      </button>
                      <button
                        onClick={() => toggleDetail(stk.stakeholder_id)}
                        className="flex items-center gap-1 px-3 py-1.5 border text-xs rounded-lg hover:bg-gray-50 text-gray-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {expandedId === stk.stakeholder_id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detail rows (expanded) */}
                {expandedId === stk.stakeholder_id && (
                  <div className="bg-gray-50 border-t px-6 py-4">
                    {loadingDetails ? (
                      <p className="text-sm text-gray-400 text-center py-4">Loading shares…</p>
                    ) : details.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No shares found for this period.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b">
                              <th className="text-left py-2 pr-4">Invoice #</th>
                              <th className="text-left py-2 pr-4">Date</th>
                              <th className="text-left py-2 pr-4">Patient</th>
                              <th className="text-left py-2 pr-4">Service</th>
                              <th className="text-right py-2 pr-4">Share %</th>
                              <th className="text-right py-2 pr-4">Amount</th>
                              <th className="text-left py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {details.map(d => (
                              <tr key={d.id} className="hover:bg-white">
                                <td className="py-2 pr-4 font-mono text-gray-700">{d.invoice_number}</td>
                                <td className="py-2 pr-4 text-gray-500">
                                  {d.invoice_date ? new Date(d.invoice_date).toLocaleDateString('en-GB') : '—'}
                                </td>
                                <td className="py-2 pr-4 text-gray-700">{d.patient_name || '—'}</td>
                                <td className="py-2 pr-4 text-gray-500">{d.service_id}</td>
                                <td className="py-2 pr-4 text-right text-gray-500">
                                  {d.share_type === 'PERCENTAGE'
                                    ? `${parseFloat(d.share_percentage || '0').toFixed(1)}%`
                                    : 'Fixed'}
                                </td>
                                <td className="py-2 pr-4 text-right font-semibold text-gray-800">
                                  {fmt(d.share_amount)} IQD
                                </td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${statusBadge(d.payment_status)}`}>
                                    {d.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t font-semibold">
                              <td colSpan={5} className="py-2 text-gray-600 text-right pr-4">Total:</td>
                              <td className="py-2 text-right text-gray-800">
                                {fmt(details.reduce((s, d) => s + parseFloat(d.share_amount || '0'), 0))} IQD
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Payment</h3>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-800">{payTarget.stakeholder_name}</p>
                <p className="text-xs text-amber-600 mt-0.5">{payTarget.stakeholder_role}</p>
                {payTarget.bank_name_ar && (
                  <p className="text-xs text-amber-700 mt-1">
                    Bank: {payTarget.bank_name_ar}
                    {payTarget.account_number && ` · A/C: ${payTarget.account_number}`}
                  </p>
                )}
                <p className="text-2xl font-bold text-amber-700 mt-3">
                  {fmt(payTarget.pending_amount)} IQD
                </p>
                <p className="text-xs text-amber-500">{payTarget.pending_count} pending shares</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Transfer reference, cheque number, etc."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {payError}
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setPayTarget(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {paying ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> Confirm Payment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
