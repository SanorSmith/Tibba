'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck, DollarSign, Clock, CheckCircle2, AlertCircle,
  RefreshCw, CreditCard, Search, X, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';

interface APInvoice {
  id: string;
  ap_number: string;
  po_number: string;
  grn_number: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: string;
  payment_date: string | null;
  notes: string | null;
}

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

const statusColor = (s: string) => {
  if (s === 'PAID')    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'PARTIAL') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'OVERDUE') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export default function PayablesPage() {
  const [invoices, setInvoices]     = useState<APInvoice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [totals, setTotals]         = useState({ pending: 0, paid: 0 });
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Linked journal entries (per invoice)
  const [journals, setJournals]         = useState<any[]>([]);
  const [loadingJournals, setLoadingJournals] = useState(false);

  // Pay modal
  const [payTarget, setPayTarget]   = useState<APInvoice | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [payDate, setPayDate]       = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod]   = useState('BANK_TRANSFER');
  const [payRef, setPayRef]         = useState('');
  const [payNotes, setPayNotes]     = useState('');
  const [paying, setPaying]         = useState(false);
  const [payError, setPayError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (filterStatus) p.set('status', filterStatus);
      if (fromDate)     p.set('from',   fromDate);
      if (toDate)       p.set('to',     toDate);
      const res = await fetch(`/api/ap-invoices?${p}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setInvoices(data.data ?? []);
      setTotals(data.totals ?? { pending: 0, paid: 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // Expand a row and lazy-load its linked journal entries
  const toggleExpand = async (invId: string) => {
    if (expandedId === invId) { setExpandedId(null); return; }
    setExpandedId(invId);
    setJournals([]);
    setLoadingJournals(true);
    try {
      const res = await fetch(`/api/ap-invoices/${invId}/journals`);
      const data = await res.json();
      setJournals(data.data ?? []);
    } catch {
      setJournals([]);
    } finally {
      setLoadingJournals(false);
    }
  };

  const handlePay = async () => {
    if (!payTarget) return;
    setPaying(true); setPayError('');
    try {
      const res = await fetch(`/api/ap-invoices/${payTarget.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          payment_date: payDate,
          payment_method: payMethod,
          payment_ref: payRef || null,
          notes: payNotes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Payment failed');
      setPayTarget(null);
      setPayAmount(''); setPayRef(''); setPayNotes('');
      load();
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setPaying(false);
    }
  };

  const filtered = invoices.filter(inv => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !inv.vendor_name?.toLowerCase().includes(q) &&
        !inv.ap_number?.toLowerCase().includes(q) &&
        !inv.po_number?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
          <p className="text-gray-500 mt-1 text-sm">Vendor invoices created from Goods Receipt Notes</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Outstanding Payables</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(totals.pending)} IQD</p>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Paid to Vendors</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totals.paid)} IQD</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 mb-1 block">Search vendor / AP #</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Vendor name or AP number…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(fromDate || toDate || filterStatus) && (
          <button onClick={() => { setFromDate(''); setToDate(''); setFilterStatus(''); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 mt-4">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            AP Invoices ({filtered.length})
          </h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading payables…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No AP invoices yet. Create a GRN from an approved purchase order to generate one.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(inv => {
              const isOverdue = inv.status !== 'PAID' && inv.due_date &&
                new Date(inv.due_date) < new Date();
              const effectiveStatus = isOverdue && inv.status !== 'PAID' ? 'OVERDUE' : inv.status;

              return (
                <div key={inv.id}>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{inv.vendor_name ?? '—'}</p>
                          <span className="text-xs font-mono text-gray-500">{inv.ap_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(effectiveStatus)}`}>
                            {effectiveStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {inv.po_number && `PO: ${inv.po_number}`}
                          {inv.grn_number && ` · GRN: ${inv.grn_number}`}
                          {inv.invoice_date && ` · Invoiced: ${new Date(inv.invoice_date).toLocaleDateString('en-GB')}`}
                          {inv.due_date && ` · Due: ${new Date(inv.due_date).toLocaleDateString('en-GB')}`}
                        </p>
                      </div>
                      <div className="flex gap-6 items-center shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Balance Due</p>
                          <p className={`font-bold text-sm ${parseFloat(inv.balance_due) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {fmt(inv.balance_due)} IQD
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="font-bold text-sm text-gray-700">{fmt(inv.total_amount)} IQD</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setPayTarget(inv);
                              setPayAmount(String(parseFloat(inv.balance_due)));
                              setPayError('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(inv.id)}
                          className="flex items-center gap-1 px-3 py-1.5 border text-xs rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {expandedId === inv.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedId === inv.id && (
                    <div className="bg-gray-50 border-t px-6 py-4 text-sm space-y-1 text-gray-600">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="text-xs text-gray-400">AP Number</p><p className="font-mono">{inv.ap_number}</p></div>
                        <div><p className="text-xs text-gray-400">Invoice Date</p><p>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : '—'}</p></div>
                        <div><p className="text-xs text-gray-400">Due Date</p><p>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '—'}</p></div>
                        <div><p className="text-xs text-gray-400">Paid</p><p className="text-emerald-600 font-medium">{fmt(inv.amount_paid)} IQD</p></div>
                        {inv.payment_date && (
                          <div><p className="text-xs text-gray-400">Payment Date</p><p>{new Date(inv.payment_date).toLocaleDateString('en-GB')}</p></div>
                        )}
                        {inv.notes && (
                          <div className="col-span-2"><p className="text-xs text-gray-400">Notes</p><p>{inv.notes}</p></div>
                        )}
                      </div>

                      {/* Linked GL Journal Entries */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Linked Journal Entries (General Ledger)</p>
                        {loadingJournals ? (
                          <p className="text-xs text-gray-400">Loading journal entries…</p>
                        ) : journals.length === 0 ? (
                          <p className="text-xs text-gray-400">No journal entries found for this invoice yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {journals.map((je: any) => (
                              <div key={je.journalid} className="bg-white border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-medium text-gray-800">{je.journalnumber}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                      je.sourcetype === 'AP_PAYMENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {je.sourcetype === 'AP_PAYMENT' ? 'Payment' : 'Invoice (owed)'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {je.journaldate ? new Date(je.journaldate).toLocaleDateString('en-GB') : ''}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-emerald-600 font-medium">{je.status}</span>
                                </div>
                                <table className="w-full text-xs">
                                  <tbody>
                                    {je.lines?.map((l: any, i: number) => (
                                      <tr key={i} className="border-t border-gray-50">
                                        <td className="py-1 text-gray-500 font-mono w-12">{l.accountcode}</td>
                                        <td className="py-1 text-gray-700">{l.accountname}</td>
                                        <td className="py-1 text-right text-gray-900">{parseFloat(l.debit) > 0 ? `${fmt(l.debit)} DR` : ''}</td>
                                        <td className="py-1 text-right text-gray-600">{parseFloat(l.credit) > 0 ? `${fmt(l.credit)} CR` : ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pay Vendor Invoice</h3>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-amber-800">{payTarget.vendor_name}</p>
                <p className="text-xs text-amber-600">{payTarget.ap_number}</p>
                <p className="text-2xl font-bold text-amber-700 mt-2">{fmt(payTarget.balance_due)} IQD</p>
                <p className="text-xs text-amber-500">balance due</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amount to Pay (IQD)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payment Date</label>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Reference / Cheque #</label>
                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{payError}</div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setPayTarget(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handlePay} disabled={paying || !payAmount}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                {paying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><CreditCard className="w-4 h-4" /> Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
