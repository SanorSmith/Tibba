'use client';

import { useEffect, useState, useMemo } from 'react';
import { RotateCcw, Plus, Search, Eye, X, CheckCircle } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { InvoiceReturn } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function ReturnsPage() {
  const [returns, setReturns] = useState<InvoiceReturn[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewRet, setViewRet] = useState<InvoiceReturn | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newReturn, setNewReturn] = useState({ invoice_number: '', reason: '', amount: 0 });

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);
  const reload = () => setReturns(financeStore.getReturns());

  const stats = useMemo(() => ({
    total: returns.length,
    totalAmount: returns.reduce((s, r) => s + r.total_return_amount, 0),
    processed: returns.filter(r => r.refund_status === 'PROCESSED').length,
    pending: returns.filter(r => r.refund_status !== 'PROCESSED' && r.refund_status !== 'REJECTED').length,
  }), [returns]);

  const statusColor = (s: string) => {
    switch (s) { case 'PROCESSED': return 'bg-emerald-100 text-emerald-700'; case 'APPROVED': return 'bg-blue-100 text-blue-700'; case 'PENDING': return 'bg-amber-100 text-amber-700'; case 'REJECTED': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const handleCreate = () => {
    const invoices = financeStore.getInvoices();
    const inv = invoices.find(i => i.invoice_number === newReturn.invoice_number);
    if (!inv) { toast.error('Invoice not found'); return; }
    if (!newReturn.reason || newReturn.amount <= 0) { toast.error('Fill all fields'); return; }
    const ret: InvoiceReturn = {
      return_id: `ret-${Date.now()}`, return_number: `RET-2024-${String(returns.length + 1).padStart(5, '0')}`,
      return_date: new Date().toISOString().split('T')[0], original_invoice_id: inv.invoice_id,
      original_invoice_number: inv.invoice_number, patient_id: inv.patient_id, patient_name_ar: inv.patient_name_ar,
      return_reason_ar: newReturn.reason, total_return_amount: newReturn.amount,
      refund_status: 'PENDING', created_at: new Date().toISOString(), created_by: 'user_001',
    };
    financeStore.addReturn(ret);
    toast.success('Return created');
    reload(); setShowCreate(false); setNewReturn({ invoice_number: '', reason: '', amount: 0 });
  };

  const handleApprove = (ret: InvoiceReturn) => {
    financeStore.updateReturn(ret.return_id, { refund_status: 'PROCESSED', refund_date: new Date().toISOString().split('T')[0], approved_by: 'user_001', approved_at: new Date().toISOString() });
    toast.success('Return processed');
    reload(); setViewRet(null);
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1><p className="text-gray-500 text-sm">Manage invoice returns and refund processing</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700 w-fit"><Plus size={16} /> New Return</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Returns', value: stats.total, color: 'text-gray-900' },
          { label: 'Total Amount', value: `${fmt(stats.totalAmount)} IQD`, color: 'text-red-600' },
          { label: 'Processed', value: stats.processed, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Return #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Original Invoice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount (IQD)</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {returns.map(r => (
              <tr key={r.return_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.return_number}</td>
                <td className="px-4 py-3 text-gray-600">{r.return_date}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.original_invoice_number}</td>
                <td className="px-4 py-3">{r.patient_name_ar}</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(r.total_return_amount)}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.refund_status)}`}>{r.refund_status}</span></td>
                <td className="px-4 py-3 text-center"><button onClick={() => setViewRet(r)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14} /></button></td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No returns found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewRet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewRet(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{viewRet.return_number}</h2><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(viewRet.refund_status)}`}>{viewRet.refund_status}</span></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Patient</span>{viewRet.patient_name_ar}</div>
              <div><span className="text-gray-500 block text-xs">Date</span>{viewRet.return_date}</div>
              <div><span className="text-gray-500 block text-xs">Original Invoice</span>{viewRet.original_invoice_number}</div>
              <div><span className="text-gray-500 block text-xs">Amount</span><span className="font-bold text-red-600">{fmt(viewRet.total_return_amount)} IQD</span></div>
              <div className="col-span-2"><span className="text-gray-500 block text-xs">Reason</span>{viewRet.return_reason_ar}</div>
              {viewRet.refund_method && <div><span className="text-gray-500 block text-xs">Refund Method</span>{viewRet.refund_method}</div>}
              {viewRet.refund_date && <div><span className="text-gray-500 block text-xs">Refund Date</span>{viewRet.refund_date}</div>}
            </div>
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Return Items</h3>
              <div className="border rounded-lg divide-y text-sm">
                {financeStore.getReturnItemsByReturn(viewRet.return_id).map(ri => (
                  <div key={ri.return_item_id} className="p-3 flex justify-between">
                    <div><div className="font-medium">{ri.service_name_ar}</div><div className="text-xs text-gray-500">Qty: {ri.quantity_returned}</div></div>
                    <div className="font-medium">{fmt(ri.return_amount)} IQD</div>
                  </div>
                ))}
                {financeStore.getReturnItemsByReturn(viewRet.return_id).length === 0 && <div className="p-3 text-center text-gray-400">No items</div>}
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              {viewRet.refund_status === 'PENDING' || viewRet.refund_status === 'APPROVED' ? (
                <button onClick={() => handleApprove(viewRet)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><CheckCircle size={14} /> Process Refund</button>
              ) : null}
              <button onClick={() => setViewRet(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">New Return</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs text-gray-500 block mb-1">Invoice Number *</label><input value={newReturn.invoice_number} onChange={e => setNewReturn({...newReturn, invoice_number: e.target.value})} placeholder="INV-2024-00001" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Reason (AR) *</label><textarea value={newReturn.reason} onChange={e => setNewReturn({...newReturn, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Return Amount (IQD) *</label><input type="number" value={newReturn.amount} onChange={e => setNewReturn({...newReturn, amount: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
