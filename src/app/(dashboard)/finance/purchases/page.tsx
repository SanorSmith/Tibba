'use client';

import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Plus, Search, Eye, X, CheckCircle, Clock, FileText } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { PurchaseRequest, PurchaseOrder } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function PurchasesPage() {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [tab, setTab] = useState<'pr' | 'po'>('pr');
  const [mounted, setMounted] = useState(false);
  const [viewPR, setViewPR] = useState<PurchaseRequest | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);
  const reload = () => { setPrs(financeStore.getPurchaseRequests()); setPos(financeStore.getPurchaseOrders()); };

  const prStats = useMemo(() => ({
    total: prs.length,
    pending: prs.filter(p => ['SUBMITTED', 'PENDING_APPROVAL'].includes(p.status)).length,
    approved: prs.filter(p => p.status === 'APPROVED').length,
    totalValue: prs.reduce((s, p) => s + p.estimated_total, 0),
  }), [prs]);

  const poStats = useMemo(() => ({
    total: pos.length,
    totalValue: pos.reduce((s, p) => s + p.total_amount, 0),
    unpaid: pos.reduce((s, p) => s + p.balance_due, 0),
    completed: pos.filter(p => p.status === 'COMPLETED').length,
  }), [pos]);

  const prStatusColor = (s: string) => {
    switch (s) { case 'APPROVED': return 'bg-emerald-100 text-emerald-700'; case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-700'; case 'SUBMITTED': return 'bg-blue-100 text-blue-700'; case 'REJECTED': return 'bg-red-100 text-red-700'; case 'DRAFT': return 'bg-gray-100 text-gray-600'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const poStatusColor = (s: string) => {
    switch (s) { case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'; case 'RECEIVED': return 'bg-blue-100 text-blue-700'; case 'SENT_TO_SUPPLIER': return 'bg-amber-100 text-amber-700'; case 'PARTIALLY_RECEIVED': return 'bg-orange-100 text-orange-700'; case 'DRAFT': return 'bg-gray-100 text-gray-600'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const priorityColor = (p: string) => {
    switch (p) { case 'URGENT': return 'bg-red-100 text-red-700'; case 'HIGH': return 'bg-orange-100 text-orange-700'; case 'NORMAL': return 'bg-blue-100 text-blue-700'; case 'LOW': return 'bg-gray-100 text-gray-600'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const handleApprovePR = (pr: PurchaseRequest) => {
    financeStore.updatePurchaseRequest(pr.pr_id, { status: 'APPROVED' });
    financeStore.addPRApproval({
      approval_id: `pra-${Date.now()}`, pr_id: pr.pr_id, approver_id: 'user_001',
      approver_name: 'Sanor', approver_role: 'Administrator', action: 'APPROVED',
      comments: 'Approved', created_at: new Date().toISOString(),
    });
    toast.success('PR approved');
    reload(); setViewPR(null);
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1><p className="text-gray-500 text-sm">Purchase requests and purchase orders</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(tab === 'pr' ? [
          { label: 'Total PRs', value: prStats.total, color: 'text-gray-900' },
          { label: 'Pending Approval', value: prStats.pending, color: 'text-gray-600' },
          { label: 'Approved', value: prStats.approved, color: 'text-gray-900' },
          { label: 'Estimated Value', value: `${fmt(prStats.totalValue)} IQD`, color: 'text-gray-900' },
        ] : [
          { label: 'Total POs', value: poStats.total, color: 'text-gray-900' },
          { label: 'Total Value', value: `${fmt(poStats.totalValue)} IQD`, color: 'text-gray-900' },
          { label: 'Unpaid Balance', value: `${fmt(poStats.unpaid)} IQD`, color: 'text-gray-600' },
          { label: 'Completed', value: poStats.completed, color: 'text-gray-900' },
        ]).map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('pr')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'pr' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Purchase Requests ({prs.length})</button>
        <button onClick={() => setTab('po')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'po' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Purchase Orders ({pos.length})</button>
      </div>

      {tab === 'pr' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PR #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Purpose</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Priority</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Est. Total (IQD)</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prs.map(pr => (
                  <tr key={pr.pr_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{pr.pr_number}</td>
                    <td className="px-4 py-3 text-gray-600">{pr.pr_date}</td>
                    <td className="px-4 py-3">{pr.department_name}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{pr.purpose_ar}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColor(pr.priority)}`}>{pr.priority}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(pr.estimated_total)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prStatusColor(pr.status)}`}>{pr.status}</span></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setViewPR(pr)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'po' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PO #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total (IQD)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Balance Due</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Payment</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pos.map(po => (
                  <tr key={po.po_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-600">{po.po_date}</td>
                    <td className="px-4 py-3">{po.supplier_name_ar}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(po.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{po.balance_due > 0 ? fmt(po.balance_due) : '-'}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${po.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{po.payment_status}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${poStatusColor(po.status)}`}>{po.status}</span></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setViewPO(po)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View PR Modal */}
      {viewPR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewPR(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{viewPR.pr_number}</h2><span className={`text-xs px-2 py-1 rounded-full font-medium ${prStatusColor(viewPR.status)}`}>{viewPR.status}</span></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Department</span>{viewPR.department_name}</div>
              <div><span className="text-gray-500 block text-xs">Requested By</span>{viewPR.requested_by_name}</div>
              <div><span className="text-gray-500 block text-xs">Priority</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(viewPR.priority)}`}>{viewPR.priority}</span></div>
              <div><span className="text-gray-500 block text-xs">Required By</span>{viewPR.required_by_date || '-'}</div>
              <div className="col-span-2"><span className="text-gray-500 block text-xs">Purpose</span>{viewPR.purpose_ar}</div>
              <div><span className="text-gray-500 block text-xs">Estimated Total</span><span className="font-bold">{fmt(viewPR.estimated_total)} IQD</span></div>
              {viewPR.converted_to_po && <div><span className="text-gray-500 block text-xs">PO Created</span><span className="text-emerald-600 font-medium">Yes</span></div>}
            </div>
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Items</h3>
              <div className="border rounded-lg divide-y text-sm">
                {financeStore.getPRItemsByPR(viewPR.pr_id).map(item => (
                  <div key={item.pr_item_id} className="p-3 flex justify-between">
                    <div><div className="font-medium">{item.item_name_ar}</div><div className="text-xs text-gray-500">{item.quantity} {item.unit_of_measure}</div></div>
                    <div className="text-right font-medium">{fmt(item.estimated_total_price)} IQD</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              {(viewPR.status === 'SUBMITTED' || viewPR.status === 'PENDING_APPROVAL') && (
                <button onClick={() => handleApprovePR(viewPR)} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><CheckCircle size={14} /> Approve</button>
              )}
              <button onClick={() => setViewPR(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View PO Modal */}
      {viewPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewPO(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{viewPO.po_number}</h2><span className={`text-xs px-2 py-1 rounded-full font-medium ${poStatusColor(viewPO.status)}`}>{viewPO.status}</span></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Supplier</span>{viewPO.supplier_name_ar}</div>
              <div><span className="text-gray-500 block text-xs">Date</span>{viewPO.po_date}</div>
              <div><span className="text-gray-500 block text-xs">Delivery Location</span>{viewPO.delivery_location_ar || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Expected Delivery</span>{viewPO.expected_delivery_date || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Subtotal</span>{fmt(viewPO.subtotal)} IQD</div>
              <div><span className="text-gray-500 block text-xs">Shipping</span>{fmt(viewPO.shipping_cost)} IQD</div>
              <div><span className="text-gray-500 block text-xs">Total</span><span className="font-bold">{fmt(viewPO.total_amount)} IQD</span></div>
              <div><span className="text-gray-500 block text-xs">Paid</span><span className="text-gray-900 font-medium">{fmt(viewPO.amount_paid)} IQD</span></div>
              <div><span className="text-gray-500 block text-xs">Balance Due</span><span className="text-gray-900 font-bold">{fmt(viewPO.balance_due)} IQD</span></div>
              <div><span className="text-gray-500 block text-xs">Payment Status</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${viewPO.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{viewPO.payment_status}</span></div>
            </div>
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Items</h3>
              <div className="border rounded-lg divide-y text-sm">
                {financeStore.getPOItemsByPO(viewPO.po_id).map(item => (
                  <div key={item.po_item_id} className="p-3 flex justify-between">
                    <div><div className="font-medium">{item.item_name_ar}</div><div className="text-xs text-gray-500">Ordered: {item.ordered_quantity} | Received: {item.received_quantity} {item.unit_of_measure}</div></div>
                    <div className="text-right font-medium">{fmt(item.line_total)} IQD</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setViewPO(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
