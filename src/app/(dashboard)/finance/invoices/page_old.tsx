'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Receipt, Plus, Search, Eye, Trash2, DollarSign, Filter, Download } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { MedicalInvoice } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<MedicalInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const [viewInv, setViewInv] = useState<MedicalInvoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);

  const reload = () => setInvoices(financeStore.getInvoices());

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== 'ALL') list = list.filter(i => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.invoice_number.toLowerCase().includes(q) || i.patient_name_ar.includes(q));
    }
    return list.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  }, [invoices, search, statusFilter]);

  const stats = useMemo(() => ({
    total: invoices.length,
    totalAmount: invoices.reduce((s, i) => s + i.total_amount, 0),
    collected: invoices.reduce((s, i) => s + i.amount_paid, 0),
    outstanding: invoices.reduce((s, i) => s + i.balance_due, 0),
  }), [invoices]);

  const handleDelete = () => {
    if (!deleteId) return;
    financeStore.deleteInvoice(deleteId);
    financeStore.deleteInvoiceItemsByInvoice(deleteId);
    toast.success('Invoice deleted');
    reload();
    setDeleteId(null);
  };

  const handlePayment = (inv: MedicalInvoice) => {
    financeStore.updateInvoice(inv.invoice_id, {
      status: 'PAID',
      amount_paid: inv.patient_responsibility,
      balance_due: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'CASH',
    });
    toast.success('Payment recorded');
    reload();
    setViewInv(null);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700';
      case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-700';
      case 'PENDING': return 'bg-blue-100 text-blue-700';
      case 'UNPAID': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      case 'REFUNDED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Invoices</h1>
          <p className="text-gray-500 text-sm">Manage patient invoices and payments</p>
        </div>
        <Link href="/finance/invoices/new" className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 transition w-fit">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: stats.total, color: 'text-gray-900' },
          { label: 'Total Amount', value: `${fmt(stats.totalAmount)} IQD`, color: 'text-gray-900' },
          { label: 'Collected', value: `${fmt(stats.collected)} IQD`, color: 'text-gray-900' },
          { label: 'Outstanding', value: `${fmt(stats.outstanding)} IQD`, color: 'text-gray-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by invoice # or patient name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PENDING">Pending</option>
          <option value="UNPAID">Unpaid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total (IQD)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Insurance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance Due</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(inv => (
                <tr key={inv.invoice_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.invoice_date}</td>
                  <td className="px-4 py-3">{inv.patient_name_ar}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{inv.insurance_coverage_amount > 0 ? fmt(inv.insurance_coverage_amount) : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{inv.balance_due > 0 ? fmt(inv.balance_due) : '-'}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewInv(inv)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye size={14} /></button>
                      <button onClick={() => setDeleteId(inv.invoice_id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y">
          {filtered.map(inv => (
            <div key={inv.invoice_id} className="p-4" onClick={() => setViewInv(inv)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{inv.invoice_number}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
              </div>
              <p className="text-sm text-gray-700">{inv.patient_name_ar}</p>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{inv.invoice_date}</span>
                <span className="font-bold text-gray-900">{fmt(inv.total_amount)} IQD</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Modal */}
      {viewInv && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewInv(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{viewInv.invoice_number}</h2>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(viewInv.status)}`}>{viewInv.status}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs">Patient</span><span className="font-medium">{viewInv.patient_name_ar}</span></div>
                <div><span className="text-gray-500 block text-xs">Date</span><span className="font-medium">{viewInv.invoice_date}</span></div>
                <div><span className="text-gray-500 block text-xs">Subtotal</span><span className="font-medium">{fmt(viewInv.subtotal)} IQD</span></div>
                <div><span className="text-gray-500 block text-xs">Discount</span><span className="font-medium">{viewInv.discount_percentage}% ({fmt(viewInv.discount_amount)} IQD)</span></div>
                <div><span className="text-gray-500 block text-xs">Total</span><span className="font-bold text-lg">{fmt(viewInv.total_amount)} IQD</span></div>
                <div><span className="text-gray-500 block text-xs">Insurance Coverage</span><span className="font-medium text-gray-600">{fmt(viewInv.insurance_coverage_amount)} IQD ({viewInv.insurance_coverage_percentage}%)</span></div>
                <div><span className="text-gray-500 block text-xs">Patient Responsibility</span><span className="font-medium">{fmt(viewInv.patient_responsibility)} IQD</span></div>
                <div><span className="text-gray-500 block text-xs">Amount Paid</span><span className="font-medium text-gray-900">{fmt(viewInv.amount_paid)} IQD</span></div>
                <div><span className="text-gray-500 block text-xs">Balance Due</span><span className="font-bold text-gray-900">{fmt(viewInv.balance_due)} IQD</span></div>
                {viewInv.payment_method && <div><span className="text-gray-500 block text-xs">Payment Method</span><span className="font-medium">{viewInv.payment_method}</span></div>}
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Services</h3>
                <div className="border rounded-lg divide-y text-sm">
                  {financeStore.getItemsByInvoice(viewInv.invoice_id).map(item => (
                    <div key={item.item_id} className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">{item.service_name_ar}</div>
                        <div className="text-xs text-gray-500">{item.service_name_en} &middot; Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right font-medium">{fmt(item.line_total)} IQD</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Shares */}
              {financeStore.getSharesByInvoice(viewInv.invoice_id).length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Revenue Shares</h3>
                  <div className="border rounded-lg divide-y text-sm">
                    {financeStore.getSharesByInvoice(viewInv.invoice_id).map(share => (
                      <div key={share.share_id} className="p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{share.stakeholder_name_ar}</div>
                          <div className="text-xs text-gray-500">{share.stakeholder_role} &middot; {share.share_percentage}%</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{fmt(share.share_amount)} IQD</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${share.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{share.payment_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewInv.notes && <div className="text-sm"><span className="text-gray-500 block text-xs mb-1">Notes</span>{viewInv.notes}</div>}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              {viewInv.balance_due > 0 && (
                <button onClick={() => handlePayment(viewInv)} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-1.5">
                  <DollarSign size={14} /> Record Payment
                </button>
              )}
              <button onClick={() => setViewInv(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Invoice?</h3>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
