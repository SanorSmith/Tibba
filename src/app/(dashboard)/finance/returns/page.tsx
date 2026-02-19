'use client';

import { useEffect, useState, useMemo } from 'react';
import { RotateCcw, Plus, Search, Eye, X, CheckCircle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

interface InvoiceReturn {
  id: string;
  return_number: string;
  return_date: string;
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name_ar: string;
  reason_ar: string;
  return_amount: number;
  status: string;
  refund_method?: string;
  refund_date?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  patient_name_ar: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<InvoiceReturn[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewRet, setViewRet] = useState<InvoiceReturn | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingReturn, setEditingReturn] = useState<InvoiceReturn | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [statusUpdatingReturn, setStatusUpdatingReturn] = useState<InvoiceReturn | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newReturn, setNewReturn] = useState({ invoice_number: '', reason: '', amount: 0 });
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<any[]>([]);

  useEffect(() => { loadReturns(); setMounted(true); }, []);
  
  const loadReturns = async () => {
    try {
      const res = await fetch('/api/invoice-returns');
      if (res.ok) {
        const data = await res.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Failed to load returns:', error);
    }
  };

  const searchInvoice = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/invoices?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSearchQuery(`${invoice.invoice_number} - ${invoice.patient_name_ar}`);
    setNewReturn({
      invoice_number: invoice.invoice_number,
      reason: '',
      amount: 0,
    });
    setSearchResults([]);

    // Fetch invoice items
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setInvoiceItems(items);
        // Initialize return items with 0 quantity for each
        setReturnItems(items.map((item: any) => ({
          ...item,
          return_quantity: 0,
          return_amount: 0,
        })));
      }
    } catch (error) {
      console.error('Failed to load invoice items:', error);
    }
  };

  const stats = useMemo(() => ({
    total: returns.length,
    totalAmount: returns.reduce((s, r) => s + r.return_amount, 0),
    processed: returns.filter(r => r.status === 'REFUNDED').length,
    pending: returns.filter(r => r.status === 'PENDING').length,
  }), [returns]);

  const statusColor = (s: string) => {
    switch (s) { 
      case 'REFUNDED': return 'bg-emerald-100 text-emerald-700'; 
      case 'APPROVED': return 'bg-blue-100 text-blue-700'; 
      case 'PENDING': return 'bg-amber-100 text-amber-700'; 
      case 'REJECTED': return 'bg-red-100 text-red-700'; 
      default: return 'bg-gray-100 text-gray-700'; 
    }
  };

  const handleCreate = async () => {
    if (!selectedInvoice) { toast.error('Please select an invoice'); return; }
    if (!newReturn.reason) { toast.error('Enter return reason'); return; }
    if (returnItems.every((item: any) => item.return_quantity <= 0)) { toast.error('Select at least one service to return'); return; }

    const totalReturnAmount = returnItems.reduce((sum: number, item: any) => sum + item.return_amount, 0);
    const returnData = {
      invoice_id: selectedInvoice.id,
      invoice_number: selectedInvoice.invoice_number,
      patient_id: selectedInvoice.patient_id,
      patient_name_ar: selectedInvoice.patient_name_ar,
      reason_ar: newReturn.reason,
      return_amount: totalReturnAmount,
      status: 'PENDING',
      items: returnItems.filter((item: any) => item.return_quantity > 0).map((item: any) => ({
        item_id: item.id,
        invoice_item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        item_name_ar: item.item_name_ar,
        original_quantity: item.quantity,
        return_quantity: item.return_quantity,
        unit_price: item.unit_price,
        return_amount: item.return_amount,
      })),
    };

    try {
      const res = await fetch('/api/invoice-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData),
      });

      if (res.ok) {
        const created = await res.json();
        setReturns(prev => [created, ...prev]);
        toast.success('Return created and saved to database');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create return');
        return;
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Network error — could not reach server');
      return;
    }

    setShowCreate(false);
    setNewReturn({ invoice_number: '', reason: '', amount: 0 });
    setSelectedInvoice(null);
    setSearchQuery('');
    setInvoiceItems([]);
    setReturnItems([]);
  };

  const handleEdit = async () => {
    if (!editingReturn) return;
    if (!editingReturn.reason_ar || editingReturn.return_amount <= 0) {
      toast.error('Fill all required fields');
      return;
    }

    try {
      const res = await fetch(`/api/invoice-returns/${editingReturn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReturn),
      });

      if (res.ok) {
        const updated = await res.json();
        setReturns(prev => prev.map(r => r.id === editingReturn.id ? updated : r));
        setShowEdit(false);
        setEditingReturn(null);
        toast.success('Return updated and saved to database');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update return');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Network error — could not reach server');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/invoice-returns/${deleteId}`, { method: 'DELETE' });

      if (res.ok) {
        setReturns(prev => prev.filter(r => r.id !== deleteId));
        setDeleteId(null);
        toast.success('Return deleted from database');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete return');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Network error — could not reach server');
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdatingReturn || !newStatus) return;

    try {
      const res = await fetch(`/api/invoice-returns/${statusUpdatingReturn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setReturns(prev => prev.map(r => r.id === statusUpdatingReturn.id ? updated : r));
        setShowStatusUpdate(false);
        setStatusUpdatingReturn(null);
        setNewStatus('');
        toast.success(`Status changed to ${newStatus} and saved`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Network error — could not reach server');
    }
  };

  const openStatusUpdate = (ret: InvoiceReturn) => {
    setStatusUpdatingReturn(ret);
    setNewStatus(ret.status);
    setShowStatusUpdate(true);
  };

  const openEdit = (ret: InvoiceReturn) => {
    setEditingReturn({ ...ret });
    setShowEdit(true);
  };

  // Helper to update return quantity for a service
  const updateReturnQuantity = (index: number, qty: number) => {
    const updated = [...returnItems];
    const maxQty = updated[index].quantity;
    const validQty = Math.max(0, Math.min(qty, maxQty));
    updated[index].return_quantity = validQty;
    updated[index].return_amount = validQty * updated[index].unit_price;
    setReturnItems(updated);
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + item.return_amount, 0);

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1><p className="text-gray-500 text-sm">Manage invoice returns and refund processing</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit"><Plus size={16} /> New Return</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Returns', value: stats.total, color: 'text-gray-900' },
          { label: 'Total Amount', value: `${fmt(stats.totalAmount)} IQD`, color: 'text-gray-900' },
          { label: 'Processed', value: stats.processed, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-gray-600' },
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
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.return_number}</td>
                <td className="px-4 py-3 text-gray-600">{r.return_date}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.invoice_number}</td>
                <td className="px-4 py-3">{r.patient_name_ar}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(r.return_amount)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setViewRet(r)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye size={14} /></button>
                    <button onClick={() => openStatusUpdate(r)} className="p-1.5 hover:bg-blue-50 rounded text-blue-500" title="Update Status"><RefreshCw size={14} /></button>
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit size={14} /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
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
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{viewRet.return_number}</h2><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(viewRet.status)}`}>{viewRet.status}</span></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Patient</span>{viewRet.patient_name_ar}</div>
              <div><span className="text-gray-500 block text-xs">Date</span>{viewRet.return_date}</div>
              <div><span className="text-gray-500 block text-xs">Original Invoice</span>{viewRet.invoice_number}</div>
              <div><span className="text-gray-500 block text-xs">Amount</span><span className="font-bold text-gray-900">{fmt(viewRet.return_amount)} IQD</span></div>
              <div className="col-span-2"><span className="text-gray-500 block text-xs">Reason</span>{viewRet.reason_ar}</div>
              {viewRet.refund_method && <div><span className="text-gray-500 block text-xs">Refund Method</span>{viewRet.refund_method}</div>}
              {viewRet.refund_date && <div><span className="text-gray-500 block text-xs">Refund Date</span>{viewRet.refund_date}</div>}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setViewRet(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editingReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Edit Return</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Invoice Number</label>
                <input value={editingReturn.invoice_number} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Reason (AR) *</label>
                <textarea
                  value={editingReturn.reason_ar}
                  onChange={e => setEditingReturn({...editingReturn, reason_ar: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="سبب الإرجاع..."
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Return Amount (IQD) *</label>
                <input
                  type="number"
                  value={editingReturn.return_amount}
                  onChange={e => setEditingReturn({...editingReturn, return_amount: Number(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <select
                  value={editingReturn.status}
                  onChange={e => setEditingReturn({...editingReturn, status: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Refund Method</label>
                <select
                  value={editingReturn.refund_method || ''}
                  onChange={e => setEditingReturn({...editingReturn, refund_method: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select method</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleEdit} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusUpdate && statusUpdatingReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStatusUpdate(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-green-600" />
                Update Return Status
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Return: <span className="font-mono font-medium">{statusUpdatingReturn.return_number}</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Patient: <span className="font-medium">{statusUpdatingReturn.patient_name_ar}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Amount:</span>
                  <span className="font-medium">{fmt(statusUpdatingReturn.return_amount)} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-mono font-medium">{statusUpdatingReturn.invoice_number}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(statusUpdatingReturn.status)}`}>
                    {statusUpdatingReturn.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowStatusUpdate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleStatusUpdate} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <RefreshCw size={14} />
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Return?</h3>
            <p className="text-sm text-gray-600 mb-4">This will permanently delete this return record.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Delete</button>
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
              {/* Search Invoice */}
              <div className="relative">
                <label className="text-xs text-gray-500 block mb-1">Search Invoice (by Patient ID or Invoice #) *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      searchInvoice(e.target.value);
                    }}
                    placeholder="P-001 or INV-2024-00001"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => selectInvoice(inv)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium text-sm">{inv.invoice_number}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Patient: {inv.patient_name_ar} • Balance: {fmt(inv.balance_due)} IQD
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Invoice Info */}
              {selectedInvoice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="font-medium text-blue-900 mb-1">Selected Invoice:</div>
                  <div className="text-blue-800">
                    <div>Invoice: {selectedInvoice.invoice_number}</div>
                    <div>Patient: {selectedInvoice.patient_name_ar}</div>
                    <div>Total: {fmt(selectedInvoice.total_amount)} IQD</div>
                    <div>Balance Due: {fmt(selectedInvoice.balance_due)} IQD</div>
                  </div>
                </div>
              )}

              <div><label className="text-xs text-gray-500 block mb-1">Reason (AR) *</label><textarea value={newReturn.reason} onChange={e => setNewReturn({...newReturn, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="سبب الإرجاع..." /></div>

              {/* Services Selection */}
              {invoiceItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Services to Return</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.item_name_ar || item.item_name}</div>
                            {item.item_name_ar && item.item_name && <div className="text-xs text-gray-400">{item.item_name}</div>}
                            <div className="text-xs text-gray-500 mt-1">
                              Qty: {item.quantity} × {fmt(item.unit_price)} IQD = {fmt(item.subtotal || item.unit_price * item.quantity)} IQD
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-xs text-gray-500">Return Qty:</label>
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={returnItems[idx]?.return_quantity || 0}
                              onChange={e => updateReturnQuantity(idx, parseInt(e.target.value) || 0)}
                              className="w-20 border rounded px-2 py-1 text-xs"
                            />
                            <span className="text-xs text-gray-400">/ {item.quantity}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Return Amount:</div>
                            <div className="text-sm font-bold text-red-600">
                              {fmt(returnItems[idx]?.return_amount || 0)} IQD
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Return Amount */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-900">Total Return Amount:</span>
                  <span className="text-lg font-bold text-red-600">{fmt(totalReturnAmount)} IQD</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => { setShowCreate(false); setSelectedInvoice(null); setSearchQuery(''); setSearchResults([]); setInvoiceItems([]); setReturnItems([]); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
