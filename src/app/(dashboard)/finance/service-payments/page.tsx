'use client';

import { useState, useMemo, useEffect } from 'react';
import { Building2, CheckCircle2, Clock, CreditCard, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import servicesData from '@/data/services.json';
import invoicesData from '@/data/finance/invoices.json';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(Math.round(n));
type PaymentStatus = 'PENDING' | 'PAID';

interface ServiceLine {
  key: string;
  service_id: string;
  service_name: string;
  provider_id: string;
  provider_name: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  quantity: number;
  service_fee: number;
  total_fee: number;
  status: PaymentStatus;
  payment_date?: string;
  payment_batch_id?: string;
}

const STORAGE_KEY = 'tibbna_service_payments';
function loadPayments(): ServiceLine[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function savePayments(lines: ServiceLine[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

function buildDemoLines(): ServiceLine[] {
  const demoInvoices = [
    { id: 'INV-2024-001', number: 'INV-2024-001', date: '2024-01-15', patient: 'أحمد محمد علي' },
    { id: 'INV-2024-002', number: 'INV-2024-002', date: '2024-01-18', patient: 'فاطمة حسين' },
    { id: 'INV-2024-003', number: 'INV-2024-003', date: '2024-02-05', patient: 'محمد الراوي' },
    { id: 'INV-2024-004', number: 'INV-2024-004', date: '2024-02-12', patient: 'زينب عباس' },
    { id: 'INV-2024-005', number: 'INV-2024-005', date: '2024-03-01', patient: 'علي حسن' },
    { id: 'INV-2024-006', number: 'INV-2024-006', date: '2024-03-10', patient: 'سارة أحمد' },
    { id: 'INV-2024-007', number: 'INV-2024-007', date: '2024-03-22', patient: 'خالد المالكي' },
    { id: 'INV-2024-008', number: 'INV-2024-008', date: '2024-04-05', patient: 'نور الجبوري' },
    { id: 'INV-2024-009', number: 'INV-2024-009', date: '2024-04-18', patient: 'حسين العبيدي' },
    { id: 'INV-2024-010', number: 'INV-2024-010', date: '2024-05-02', patient: 'رنا الشمري' },
  ];
  const svcIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return demoInvoices.map((inv, i) => {
    const svc = servicesData.services[svcIndices[i]];
    if (!svc || !svc.provider_id) return null;
    return {
      key: `${inv.id}-0`,
      service_id: svc.id,
      service_name: svc.name,
      provider_id: svc.provider_id,
      provider_name: svc.provider_name || '',
      invoice_id: inv.id,
      invoice_number: inv.number,
      invoice_date: inv.date,
      patient_name: inv.patient,
      quantity: 1,
      service_fee: svc.service_fee || 0,
      total_fee: svc.service_fee || 0,
      status: 'PENDING' as PaymentStatus,
    };
  }).filter(Boolean) as ServiceLine[];
}

export default function ServicePaymentsPage() {
  const [mounted, setMounted] = useState(false);
  const [payments, setPayments] = useState<ServiceLine[]>([]);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    const stored = loadPayments();
    if (stored.length > 0) {
      setPayments(stored);
    } else {
      const allInvoices: any[] = (invoicesData as any).invoices || [];
      const lines: ServiceLine[] = [];
      allInvoices.forEach((inv: any) => {
        (inv.items || []).forEach((item: any, idx: number) => {
          const svc = servicesData.services.find(s => s.name === item.item_name || s.id === item.service_id);
          if (!svc?.provider_id) return;
          const qty = item.quantity || 1;
          const fee = svc.service_fee || 0;
          lines.push({
            key: `${inv.id}-${idx}`,
            service_id: svc.id,
            service_name: svc.name,
            provider_id: svc.provider_id,
            provider_name: svc.provider_name || '',
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            patient_name: inv.patient_name_ar || inv.patient_name || 'Unknown',
            quantity: qty,
            service_fee: fee,
            total_fee: fee * qty,
            status: 'PENDING',
          });
        });
      });
      const final = lines.length > 0 ? lines : buildDemoLines();
      setPayments(final);
      savePayments(final);
    }
  }, []);

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    payments.forEach(p => map.set(p.provider_id, p.provider_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const filtered = useMemo(() => payments.filter(p => {
    if (providerFilter !== 'ALL' && p.provider_id !== providerFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.service_name.toLowerCase().includes(q) || p.patient_name.toLowerCase().includes(q) ||
             p.invoice_number.toLowerCase().includes(q) || p.provider_name.toLowerCase().includes(q);
    }
    return true;
  }), [payments, providerFilter, statusFilter, search]);

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
      pending: val.lines.filter(l => l.status === 'PENDING').reduce((s, l) => s + l.total_fee, 0),
      paid: val.lines.filter(l => l.status === 'PAID').reduce((s, l) => s + l.total_fee, 0),
    }));
  }, [filtered]);

  const kpis = useMemo(() => ({
    totalLines: payments.length,
    pendingLines: payments.filter(p => p.status === 'PENDING').length,
    paidLines: payments.filter(p => p.status === 'PAID').length,
    totalAmount: payments.reduce((s, p) => s + p.total_fee, 0),
    pendingAmount: payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.total_fee, 0),
    paidAmount: payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.total_fee, 0),
  }), [payments]);

  const selectedTotal = useMemo(() =>
    payments.filter(p => selectedLines.has(p.key)).reduce((s, p) => s + p.total_fee, 0),
  [payments, selectedLines]);

  function toggleProvider(pid: string) {
    setExpandedProviders(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  }
  function toggleLine(key: string) {
    setSelectedLines(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleProviderLines(lines: ServiceLine[]) {
    const keys = lines.filter(l => l.status === 'PENDING').map(l => l.key);
    const allSel = keys.every(k => selectedLines.has(k));
    setSelectedLines(prev => { const n = new Set(prev); keys.forEach(k => allSel ? n.delete(k) : n.add(k)); return n; });
  }

  function handleCreatePayment() {
    if (selectedLines.size === 0) { toast.error('Select at least one service line'); return; }
    const batchId = `BATCH-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];
    const updated = payments.map(p =>
      selectedLines.has(p.key) ? { ...p, status: 'PAID' as PaymentStatus, payment_date: now, payment_batch_id: batchId } : p
    );
    setPayments(updated);
    savePayments(updated);
    setSelectedLines(new Set());
    setShowCreateModal(false);
    toast.success(`Payment batch ${batchId} created — ${selectedLines.size} lines marked as paid`);
  }

  if (!mounted) return null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Share Payments</h1>
          <p className="text-gray-500 text-sm">Manage payments owed to service providers from customer invoices</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-600 w-fit">
          <CreditCard size={16} /> Create Payment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Lines', value: kpis.totalLines, color: 'text-gray-900' },
          { label: 'Pending Lines', value: kpis.pendingLines, color: 'text-amber-600' },
          { label: 'Paid Lines', value: kpis.paidLines, color: 'text-emerald-600' },
          { label: 'Total Amount', value: `${fmt(kpis.totalAmount)} $`, color: 'text-gray-900' },
          { label: 'Pending Amount', value: `${fmt(kpis.pendingAmount)} $`, color: 'text-amber-600' },
          { label: 'Paid Amount', value: `${fmt(kpis.paidAmount)} $`, color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {/* Grouped by Provider */}
      <div className="space-y-4">
        {grouped.length === 0 && <div className="text-center py-12 text-gray-400">No service payment lines found</div>}
        {grouped.map(group => {
          const isExpanded = expandedProviders.has(group.provider_id);
          const pendingLines = group.lines.filter(l => l.status === 'PENDING');
          const allPendingSel = pendingLines.length > 0 && pendingLines.every(l => selectedLines.has(l.key));
          const provInfo = servicesData.providers.find(p => p.id === group.provider_id);
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
                    <div className="text-right"><div className="text-xs text-gray-500">Total</div><div className="font-semibold">{fmt(group.total)} $</div></div>
                    <div className="text-right"><div className="text-xs text-amber-600">Pending</div><div className="font-semibold text-amber-600">{fmt(group.pending)} $</div></div>
                    <div className="text-right"><div className="text-xs text-emerald-600">Paid</div><div className="font-semibold text-emerald-600">{fmt(group.paid)} $</div></div>
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
                        <tr key={line.key} className={`hover:bg-gray-50 ${selectedLines.has(line.key) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-2">
                            {line.status === 'PENDING' && (
                              <input type="checkbox" checked={selectedLines.has(line.key)} onChange={() => toggleLine(line.key)} className="rounded" />
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-blue-600">{line.invoice_number}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{line.invoice_date}</td>
                          <td className="px-4 py-2 font-medium">{line.patient_name}</td>
                          <td className="px-4 py-2 text-gray-700">{line.service_name}</td>
                          <td className="px-4 py-2 text-right">{line.quantity}</td>
                          <td className="px-4 py-2 text-right">{fmt(line.service_fee)} $</td>
                          <td className="px-4 py-2 text-right font-semibold">{fmt(line.total_fee)} $</td>
                          <td className="px-4 py-2 text-center">
                            {line.status === 'PAID'
                              ? <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium"><CheckCircle2 size={10} /> Paid</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium"><Clock size={10} /> Pending</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-600 text-right">Provider Total:</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-900">{fmt(group.total)} $</td>
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
      {selectedLines.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-4 z-40">
          <span className="text-sm">{selectedLines.size} line{selectedLines.size > 1 ? 's' : ''} selected</span>
          <span className="font-bold">{fmt(selectedTotal)} $</span>
          <button onClick={handleCreatePayment}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
            <CreditCard size={14} /> Create Payment
          </button>
          <button onClick={() => setSelectedLines(new Set())} className="text-gray-400 hover:text-white"><X size={16} /></button>
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
                Check the boxes next to service lines to include them in this payment batch. All selected lines will be marked as <strong>Paid</strong>.
              </p>
              {grouped.filter(g => g.pending > 0).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">All service lines are already paid</div>
              )}
              {grouped.filter(g => g.pending > 0).map(group => {
                const pendingLines = group.lines.filter(l => l.status === 'PENDING');
                const provInfo = servicesData.providers.find(p => p.id === group.provider_id);
                return (
                  <div key={group.provider_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{group.provider_name}</div>
                        {provInfo && <div className="text-xs text-gray-500">{provInfo.contact} · {provInfo.phone} · {provInfo.email}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{pendingLines.length} pending lines</div>
                        <div className="font-bold text-amber-600">{fmt(group.pending)} $</div>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 text-gray-500 font-medium">
                            <input type="checkbox"
                              checked={pendingLines.every(l => selectedLines.has(l.key))}
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
                          <tr key={line.key} className={`border-b last:border-0 ${selectedLines.has(line.key) ? 'bg-blue-50' : ''}`}>
                            <td className="py-1.5">
                              <input type="checkbox" checked={selectedLines.has(line.key)} onChange={() => toggleLine(line.key)} className="rounded mr-2" />
                              <span className="font-mono">{line.invoice_number}</span>
                            </td>
                            <td className="py-1.5">{line.patient_name}</td>
                            <td className="py-1.5">{line.service_name}</td>
                            <td className="py-1.5 text-right font-semibold">{fmt(line.total_fee)} $</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {selectedLines.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-blue-800 font-medium">{selectedLines.size} lines selected</span>
                  <span className="font-bold text-blue-900">{fmt(selectedTotal)} $</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreatePayment} disabled={selectedLines.size === 0}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-600">
                <CreditCard size={14} /> Create Payment ({selectedLines.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
