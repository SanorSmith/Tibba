'use client';

import { useEffect, useState, useMemo } from 'react';
import { Truck, Plus, Search, Edit, Trash2, Eye, X, CheckCircle } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { Supplier, SupplierCategory } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const catLabel: Record<string, string> = { MEDICAL_SUPPLIES: 'Medical Supplies', PHARMACEUTICALS: 'Pharmaceuticals', EQUIPMENT: 'Equipment', SERVICES: 'Services' };
const catColor: Record<string, string> = { MEDICAL_SUPPLIES: 'bg-blue-100 text-blue-700', PHARMACEUTICALS: 'bg-emerald-100 text-emerald-700', EQUIPMENT: 'bg-purple-100 text-purple-700', SERVICES: 'bg-amber-100 text-amber-700' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [current, setCurrent] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);
  const reload = () => setSuppliers(financeStore.getSuppliers());

  const filtered = useMemo(() => {
    let f = suppliers;
    if (catFilter !== 'ALL') f = f.filter(s => s.supplier_category === catFilter);
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.company_name_ar.includes(q) || (s.company_name_en || '').toLowerCase().includes(q) || s.supplier_code.toLowerCase().includes(q)); }
    return f;
  }, [suppliers, search, catFilter]);

  const empty = (): Supplier => ({
    supplier_id: `sup-${Date.now()}`, supplier_code: `SUP-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    company_name_ar: '', phone: '', supplier_category: 'MEDICAL_SUPPLIES',
    is_active: true, is_approved: false, created_at: new Date().toISOString(),
  });

  const openCreate = () => { setCurrent(empty()); setModal('create'); };
  const openEdit = (s: Supplier) => { setCurrent({ ...s }); setModal('edit'); };
  const openView = (s: Supplier) => { setCurrent(s); setModal('view'); };

  const handleSave = () => {
    if (!current || !current.company_name_ar || !current.phone) { toast.error('Fill required fields'); return; }
    if (modal === 'create') { financeStore.addSupplier(current); toast.success('Supplier added'); }
    else { financeStore.updateSupplier(current.supplier_id, current); toast.success('Supplier updated'); }
    reload(); setModal(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    financeStore.deleteSupplier(deleteId); toast.success('Deleted'); reload(); setDeleteId(null);
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1><p className="text-gray-500 text-sm">{suppliers.length} suppliers registered</p></div>
        <button onClick={openCreate} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit"><Plus size={16} /> Add Supplier</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="ALL">All Categories</option>
          {Object.entries(catLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.supplier_id} className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer" onClick={() => openView(s)}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold">{s.company_name_ar}</div>
                {s.company_name_en && <div className="text-xs text-gray-500">{s.company_name_en}</div>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColor[s.supplier_category] || 'bg-gray-100 text-gray-700'}`}>{catLabel[s.supplier_category]}</span>
            </div>
            <div className="text-xs text-gray-400 mb-2">{s.supplier_code}</div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><span className="text-gray-500">Phone:</span> {s.phone}</div>
              <div><span className="text-gray-500">Contact:</span> {s.contact_person_ar || '-'}</div>
              {s.credit_limit !== undefined && <div><span className="text-gray-500">Credit:</span> {fmt(s.credit_limit)} IQD</div>}
              <div className="flex items-center gap-1">
                {s.is_approved ? <CheckCircle size={12} className="text-emerald-500" /> : <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
                <span className={s.is_approved ? 'text-emerald-600' : 'text-amber-600'}>{s.is_approved ? 'Approved' : 'Pending'}</span>
              </div>
            </div>
            <div className="flex gap-1 pt-3 border-t">
              <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="text-xs px-2 py-1 border rounded hover:bg-gray-50"><Edit size={12} className="inline mr-1" />Edit</button>
              <button onClick={e => { e.stopPropagation(); setDeleteId(s.supplier_id); }} className="text-xs px-2 py-1 border rounded text-red-500 hover:bg-red-50"><Trash2 size={12} className="inline mr-1" />Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No suppliers found</div>}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h2><button onClick={() => setModal(null)}><X size={18} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 block mb-1">Company Name (AR) *</label><input value={current.company_name_ar} onChange={e => setCurrent({...current, company_name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Company Name (EN)</label><input value={current.company_name_en || ''} onChange={e => setCurrent({...current, company_name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Category *</label><select value={current.supplier_category} onChange={e => setCurrent({...current, supplier_category: e.target.value as SupplierCategory})} className="w-full border rounded-lg px-3 py-2 text-sm">{Object.entries(catLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Phone *</label><input value={current.phone} onChange={e => setCurrent({...current, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Contact Person</label><input value={current.contact_person_ar || ''} onChange={e => setCurrent({...current, contact_person_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Email</label><input value={current.email || ''} onChange={e => setCurrent({...current, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Governorate</label><input value={current.governorate || ''} onChange={e => setCurrent({...current, governorate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Credit Limit (IQD)</label><input type="number" value={current.credit_limit || 0} onChange={e => setCurrent({...current, credit_limit: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Payment Terms</label><input value={current.payment_terms_ar || ''} onChange={e => setCurrent({...current, payment_terms_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={current.is_approved} onChange={e => setCurrent({...current, is_approved: e.target.checked})} /><label className="text-sm">Approved</label></div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">{current.company_name_ar}</h2><p className="text-xs text-gray-500">{current.company_name_en}</p></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Code</span>{current.supplier_code}</div>
              <div><span className="text-gray-500 block text-xs">Category</span>{catLabel[current.supplier_category]}</div>
              <div><span className="text-gray-500 block text-xs">Phone</span>{current.phone}</div>
              <div><span className="text-gray-500 block text-xs">Email</span>{current.email || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Contact</span>{current.contact_person_ar || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Governorate</span>{current.governorate || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Credit Limit</span>{current.credit_limit ? fmt(current.credit_limit) + ' IQD' : '-'}</div>
              <div><span className="text-gray-500 block text-xs">Payment Terms</span>{current.payment_terms_ar || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Bank</span>{current.bank_name_ar || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Status</span>{current.is_approved ? <span className="text-emerald-600">Approved</span> : <span className="text-amber-600">Pending Approval</span>}</div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Supplier?</h3>
            <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
