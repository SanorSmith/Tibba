'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Building2, CheckCircle2, Clock, CreditCard, X, ChevronDown, ChevronUp, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(Math.round(n));
type PaymentStatus = 'PENDING' | 'PAID';

interface ServiceLine {
  id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  item_code?: string;
  service_name: string;
  provider_id: string;
  provider_name: string;
  quantity: number;
  unit_price: number;
  service_fee: number;
  total_fee: number;
  payment_status: PaymentStatus;
  payment_batch_id?: string;
  payment_date?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'PRV001', name: 'Baghdad Medical Center', contact: 'Dr. Khalid Al-Rawi', phone: '07901234567', email: 'info@baghdadmed.iq' },
  { id: 'PRV002', name: 'Al-Rasheed Radiology Lab', contact: 'Dr. Sara Ahmed', phone: '07902345678', email: 'radiology@alrasheed.iq' },
  { id: 'PRV003', name: 'National Laboratory Services', contact: 'Ahmed Kareem', phone: '07903456789', email: 'lab@nationallab.iq' },
  { id: 'PRV004', name: 'Al-Amal Therapy Center', contact: 'Zainab Mohammed', phone: '07904567890', email: 'therapy@alamal.iq' },
  { id: 'PRV005', name: 'Iraqi Dental Group', contact: 'Dr. Hassan Ali', phone: '07905678901', email: 'dental@iraqidental.iq' },
  { id: 'PRV006', name: 'Emergency Care Solutions', contact: 'Dr. Abbas Hussein', phone: '07906789012', email: 'emergency@ecs.iq' },
  { id: 'PRV007', name: 'Preventive Health Institute', contact: 'Dr. Fatima Al-Jubouri', phone: '07907890123', email: 'preventive@phi.iq' },
  { id: 'PRV008', name: 'Al-Zahrawi Surgical Center', contact: 'Dr. Mohammed Al-Rawi', phone: '07908901234', email: 'surgery@alzahrawi.iq' },
];

export default function ServicePaymentsPage() {
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadLines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/service-payments');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const data: ServiceLine[] = await res.json();
      setLines(data);
    } catch (e: any) {
      setError(e.message);
      toast.error('Failed to load service payments: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLines(); }, [loadLines]);

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    lines.forEach(l => map.set(l.provider_id, l.provider_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [lines]);

  const filtered = useMemo(() => lines.filter(l => {
    if (providerFilter !== 'ALL' && l.provider_id !== providerFilter) return false;
    if (statusFilter !== 'ALL' && l.payment_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.service_name.toLowerCase().includes(q) ||
             l.patient_name.toLowerCase().includes(q) ||
             l.invoice_number.toLowerCase().includes(q) ||
             l.provider_name.toLowerCase().includes(q);
    }
    return true;
  }), [lines, providerFilter, statusFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { provider_name: string; lines: ServiceLine[] }>();
    filtered.forEach(line => {
      if (!map.has(line.provider_id)) map.set(line.provider_id, { provider_name: line.provider_name, lines: [] });
      map.get(line.provider_id)!.lines.push(line);
    });
    return Array.from(map.entries()).map(([pid, val]) => ({
      provider_id: pid,
      provider_name: val.provider_name,
      lines: val.lines,
      total: val.lines.reduce((s, l) => s + l.total_fee, 0),
      pending: val.lines.filter(l => l.payment_status === 'PENDING').reduce((s, l) => s + l.total_fee, 0),
      paid: val.lines.filter(l => l.payment_status === 'PAID').reduce((s, l) => s + l.total_fee, 0),
    }));
  }, [filtered]);

  const kpis = useMemo(() => ({
    totalLines: lines.length,
    pendingLines: lines.filter(l => l.payment_status === 'PENDING').length,
    paidLines: lines.filter(l => l.payment_status === 'PAID').length,
    totalAmount: lines.reduce((s, l) => s + l.total_fee, 0),
    pendingAmount: lines.filter(l => l.payment_status === 'PENDING').reduce((s, l) => s + l.total_fee, 0),
    paidAmount: lines.filter(l => l.payment_status === 'PAID').reduce((s, l) => s + l.total_fee, 0),
  }), [lines]);

  const selectedTotal = useMemo(() =>
    lines.filter(l => selectedIds.has(l.id)).reduce((s, l) => s + l.total_fee, 0),
  [lines, selectedIds]);

  function toggleProvider(pid: string) {
    setExpandedProviders(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  }
  function toggleId(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleProviderLines(pLines: ServiceLine[]) {
    const ids = pLines.filter(l => l.payment_status === 'PENDING').map(l => l.id);
    const allSel = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => allSel ? n.delete(id) : n.add(id)); return n; });
  }

  async function handleCreatePayment() {
    if (selectedIds.size === 0) { toast.error('Select at least one service line'); return; }
    setSaving(true);
    const batchId = `BATCH-${Date.now()}`;
    try {
      const res = await fetch('/api/service-payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), payment_batch_id: batchId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment');
      }
      const result = await res.json();
      toast.success(`Payment batch ${batchId} created — ${result.updated} lines marked as paid`);
      setSelectedIds(new Set());
      setShowCreateModal(false);
      await loadLines();
    } catch (e: any) {
      toast.error('Failed to create payment: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="text-center space-y-2">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-500 text-sm">Loading service payment lines...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Failed to load service payments</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <p className="text-xs text-red-500 mt-2">Make sure the Supabase migration 011_service_payments.sql has been applied and invoices with service items exist.</p>
          <button onClick={loadLines} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Share Payments</h1>
          <p className="text-gray-500 text-sm">Manage payments owed to service providers from customer invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLines} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-600">
            <CreditCard size={16} /> Create Payment
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Lines', value: kpis.totalLines, color: 'text-gray-900' },
          { label: 'Pending Lines', value: kpis.pendingLines, color: 'text-amber-600' },
          { label: 'Paid Lines', value: kpis.paidLines, color: 'text-emerald-600' },
          { label: 'Total Amount', value: `${fmt(kpis.totalAmount)} IQD`, color: 'text-gray-900' },
          { label: 'Pending Amount', value: `${fmt(kpis.pendingAmount)} IQD`, color: 'text-amber-600' },
          { label: 'Paid Amount', value: `${fmt(kpis.paidAmount)} IQD`, color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {lines.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-amber-800">No service payment lines found</p>
          <p className="text-sm text-amber-600 mt-1">
            Create a Customer Invoice with service items — the services will automatically appear here for payment processing.
          </p>
        </div>
      )}

      {/* Filters */}
      {lines.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by service, patient, invoice, or provider..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
          </div>
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="ALL">All Providers</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'PAID')} className="border rounded-lg px-3 py-2 text-sm">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      )}

      {/* Grouped by Provider */}
      <div className="space-y-4">
        {grouped.map(group => {
          const isExpanded = expandedProviders.has(group.provider_id);
          const pendingLines = group.lines.filter(l => l.payment_status === 'PENDING');
          const allPendingSel = pendingLines.length > 0 && pendingLines.every(l => selectedIds.has(l.id));
          const provInfo = PROVIDERS.find(p => p.id === group.provider_id);
          return (
            <div key={group.provider_id} className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => toggleProvider(group.provider_id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{group.provider_name}</div>
                    <div className="text-xs text-gray-500">{provInfo?.contact}{provInfo?.phone ? ` · ${provInfo.phone}` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex gap-4 text-sm">
                    <div className="text-right"><div className="text-xs text-gray-500">Total</div><div className="font-semibold">{fmt(group.total)} IQD</div></div>
                    <div className="text-right"><div className="text-xs text-amber-600">Pending</div><div className="font-semibold text-amber-600">{fmt(group.pending)} IQD</div></div>
                    <div className="text-right"><div className="text-xs text-emerald-600">Paid</div><div className="font-semibold text-emerald-600">{fmt(group.paid)} IQD</div></div>
                    <div className="text-right"><div className="text-xs text-gray-500">Lines</div><div className="font-semibold">{group.lines.length}</div></div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left w-8">
                          <input type="checkbox" checked={allPendingSel} onChange={() => toggleProviderLines(group.lines)} className="rounded" title="Select all pending" />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Patient</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Service</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Fee/Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Fee</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.lines.map(line => (
                        <tr key={line.id} className={`hover:bg-gray-50 ${selectedIds.has(line.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-2">
                            {line.payment_status === 'PENDING' && (
                              <input type="checkbox" checked={selectedIds.has(line.id)} onChange={() => toggleId(line.id)} className="rounded" />
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-blue-600">{line.invoice_number}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{line.invoice_date}</td>
                          <td className="px-4 py-2 font-medium">{line.patient_name}</td>
                          <td className="px-4 py-2 text-gray-700">{line.service_name}</td>
                          <td className="px-4 py-2 text-right">{line.quantity}</td>
                          <td className="px-4 py-2 text-right">{fmt(line.service_fee)} IQD</td>
                          <td className="px-4 py-2 text-right font-semibold">{fmt(line.total_fee)} IQD</td>
                          <td className="px-4 py-2 text-center">
                            {line.payment_status === 'PAID'
                              ? <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium"><CheckCircle2 size={10} /> Paid {line.payment_date ? `· ${line.payment_date}` : ''}</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium"><Clock size={10} /> Pending</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-600 text-right">Provider Total:</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-900">{fmt(group.total)} IQD</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-4 z-40">
          <span className="text-sm">{selectedIds.size} line{selectedIds.size > 1 ? 's' : ''} selected</span>
          <span className="font-bold">{fmt(selectedTotal)} IQD</span>
          <button onClick={handleCreatePayment} disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50">
            <CreditCard size={14} /> {saving ? 'Processing...' : 'Create Payment'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Create Service Payment</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Check the boxes next to service lines to include them in this payment batch. All selected lines will be marked as <strong>Paid</strong> in the database.
              </p>
              {grouped.filter(g => g.pending > 0).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">All service lines are already paid</div>
              )}
              {grouped.filter(g => g.pending > 0).map(group => {
                const pendingLines = group.lines.filter(l => l.payment_status === 'PENDING');
                const provInfo = PROVIDERS.find(p => p.id === group.provider_id);
                return (
                  <div key={group.provider_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{group.provider_name}</div>
                        {provInfo && <div className="text-xs text-gray-500">{provInfo.contact} · {provInfo.phone} · {provInfo.email}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{pendingLines.length} pending lines</div>
                        <div className="font-bold text-amber-600">{fmt(group.pending)} IQD</div>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 text-gray-500 font-medium">
                            <input type="checkbox"
                              checked={pendingLines.every(l => selectedIds.has(l.id))}
                              onChange={() => toggleProviderLines(pendingLines)}
                              className="rounded mr-2" />
                            Invoice
                          </th>
                          <th className="text-left py-1 text-gray-500 font-medium">Patient</th>
                          <th className="text-left py-1 text-gray-500 font-medium">Service</th>
                          <th className="text-right py-1 text-gray-500 font-medium">Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingLines.map(line => (
                          <tr key={line.id} className={`border-b last:border-0 ${selectedIds.has(line.id) ? 'bg-blue-50' : ''}`}>
                            <td className="py-1.5">
                              <input type="checkbox" checked={selectedIds.has(line.id)} onChange={() => toggleId(line.id)} className="rounded mr-2" />
                              <span className="font-mono">{line.invoice_number}</span>
                            </td>
                            <td className="py-1.5">{line.patient_name}</td>
                            <td className="py-1.5">{line.service_name}</td>
                            <td className="py-1.5 text-right font-semibold">{fmt(line.total_fee)} IQD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {selectedIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-blue-800 font-medium">{selectedIds.size} lines selected</span>
                  <span className="font-bold text-blue-900">{fmt(selectedTotal)} IQD</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreatePayment} disabled={selectedIds.size === 0 || saving}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-600">
                <CreditCard size={14} /> {saving ? 'Processing...' : `Create Payment (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
