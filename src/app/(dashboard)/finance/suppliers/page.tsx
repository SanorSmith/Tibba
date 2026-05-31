'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const catLabel: Record<string, string> = { MEDICAL_SUPPLIES: 'Medical Supplies', PHARMACEUTICALS: 'Pharmaceuticals', EQUIPMENT: 'Equipment', SERVICES: 'Services', pharmacy: 'Pharmacy', materials: 'Materials', equipment: 'Equipment', general: 'General' };
const catColor: Record<string, string> = { MEDICAL_SUPPLIES: 'bg-blue-100 text-blue-700', PHARMACEUTICALS: 'bg-emerald-100 text-emerald-700', EQUIPMENT: 'bg-purple-100 text-purple-700', SERVICES: 'bg-amber-100 text-amber-700', pharmacy: 'bg-emerald-100 text-emerald-700', materials: 'bg-blue-100 text-blue-700', equipment: 'bg-purple-100 text-purple-700', general: 'bg-gray-100 text-gray-700' };

const countries = [
  'Iraq', 'United States', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Turkey', 'Russia', 'China', 'Japan', 'South Korea', 'India', 'Pakistan', 'Bangladesh', 'Iran', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Egypt', 'Jordan', 'Lebanon', 'Syria', 'Yemen', 'Afghanistan', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Australia', 'New Zealand', 'South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'Singapore', 'Hong Kong', 'Taiwan', 'Israel', 'Palestine',
];

const currencies = [
  'USD', 'EUR', 'GBP', 'IQD', 'SAR', 'AED', 'KWD', 'QAR', 'OMR', 'BHD', 'EGP', 'JOD', 'LBP', 'SYP', 'YER', 'AFN', 'PKR', 'INR', 'BDT', 'CNY', 'JPY', 'KRW', 'TWD', 'HKD', 'SGD', 'MYR', 'THB', 'VND', 'IDR', 'PHP', 'TRY', 'RUB', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'GRD', 'SEK', 'NOK', 'DKK', 'CHF', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'VES', 'AUD', 'NZD', 'ZAR', 'NGN', 'KES', 'ETB', 'MAD', 'DZD', 'TND', 'LYD', 'SDG', 'ILS',
];

interface DbSupplier {
  supplierid: string;
  code: string;
  name: string;
  category: string;
  type: string;
  phonenumber: string;
  email: string | null;
  contactperson: string | null;
  city: string | null;
  country: string | null;
  addressline1: string | null;
  paymentterms: string | null;
  creditlimit: number | null;
  currency: string | null;
  isactive: boolean;
  createdat: string;
}

interface FormSupplier {
  supplierid?: string;
  code: string;
  company_name_ar: string;
  company_name_en: string;
  supplier_category: string;
  supplier_type: string;
  phone: string;
  email: string;
  contact_person: string;
  city: string;
  country: string;
  addressline1: string;
  payment_terms: string;
  credit_limit: number;
  currency: string;
  isactive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [current, setCurrent] = useState<FormSupplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const workspaceId = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

  useEffect(() => { fetchSuppliers(); setMounted(true); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/suppliers?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.success) setSuppliers(data.data);
      else toast.error(data.error);
    } catch { toast.error('Failed to fetch suppliers'); }
    finally { setLoading(false); }
  };

  const toForm = (db: DbSupplier): FormSupplier => ({
    supplierid: db.supplierid,
    code: db.code,
    company_name_ar: db.name,
    company_name_en: '',
    supplier_category: db.category.toUpperCase() as any,
    supplier_type: db.type,
    phone: db.phonenumber,
    email: db.email || '',
    contact_person: db.contactperson || '',
    city: db.city || '',
    country: db.country || '',
    addressline1: db.addressline1 || '',
    payment_terms: db.paymentterms || '',
    credit_limit: db.creditlimit || 0,
    currency: db.currency || 'USD',
    isactive: db.isactive,
  });

  const toDb = (form: FormSupplier): any => ({
    code: form.code,
    name: form.company_name_ar,
    category: form.supplier_category.toLowerCase(),
    type: form.supplier_type,
    phonenumber: form.phone,
    email: form.email || null,
    contactperson: form.contact_person || null,
    city: form.city || null,
    country: form.country || null,
    addressline1: form.addressline1 || null,
    paymentterms: form.payment_terms || null,
    creditlimit: form.credit_limit || null,
    currency: form.currency || 'USD',
    isactive: form.isactive,
    workspaceid: workspaceId,
  });

  const filtered = useMemo(() => {
    let f = suppliers;
    if (catFilter !== 'ALL') f = f.filter(s => s.category === catFilter.toLowerCase());
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)); }
    return f;
  }, [suppliers, search, catFilter]);

  const empty = (): FormSupplier => ({
    code: '',
    company_name_ar: '',
    company_name_en: '',
    supplier_category: 'MEDICAL_SUPPLIES',
    supplier_type: 'vendor',
    phone: '',
    email: '',
    contact_person: '',
    city: '',
    country: '',
    addressline1: '',
    payment_terms: '',
    credit_limit: 0,
    currency: 'USD',
    isactive: true,
  });

  const openCreate = () => { setCurrent(empty()); setModal('create'); };
  const openEdit = (s: DbSupplier) => { setCurrent(toForm(s)); setModal('edit'); };
  const openView = (s: DbSupplier) => { setCurrent(toForm(s)); setModal('view'); };

  const handleSave = async () => {
    if (!current || !current.company_name_ar || !current.phone) { toast.error('Fill required fields'); return; }
    setLoading(true);
    try {
      const dbData = toDb(current);
      if (modal === 'create') {
        const res = await fetch('/api/finance/suppliers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbData),
        });
        const data = await res.json();
        if (data.success) { toast.success('Supplier added'); fetchSuppliers(); setModal(null); }
        else toast.error(data.error);
      } else {
        const res = await fetch(`/api/finance/suppliers/${current.supplierid}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbData),
        });
        const data = await res.json();
        if (data.success) { toast.success('Supplier updated'); fetchSuppliers(); setModal(null); }
        else toast.error(data.error);
      }
    } catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/suppliers/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Deleted'); fetchSuppliers(); setDeleteId(null); }
      else toast.error(data.error);
    } catch { toast.error('Failed to delete'); }
    finally { setLoading(false); }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;
  if (loading) return <div className="p-6 text-center">Loading...</div>;

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
          <div key={s.supplierid} className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer" onClick={() => openView(s)}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-gray-500">{s.city || ''}, {s.country || ''}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColor[s.category] || 'bg-gray-100 text-gray-700'}`}>{catLabel[s.category] || s.category}</span>
            </div>
            <div className="text-xs text-gray-400 mb-2">{s.code}</div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><span className="text-gray-500">Phone:</span> {s.phonenumber}</div>
              <div><span className="text-gray-500">Contact:</span> {s.contactperson || '-'}</div>
              {s.creditlimit !== null && <div><span className="text-gray-500">Credit:</span> {fmt(s.creditlimit)} {s.currency}</div>}
              <div className="flex items-center gap-1">
                {s.isactive ? <CheckCircle size={12} className="text-emerald-500" /> : <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
                <span className={s.isactive ? 'text-emerald-600' : 'text-amber-600'}>{s.isactive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex gap-1 pt-3 border-t">
              <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="text-xs px-2 py-1 border rounded hover:bg-gray-50"><Edit size={12} className="inline mr-1" />Edit</button>
              <button onClick={e => { e.stopPropagation(); setDeleteId(s.supplierid); }} className="text-xs px-2 py-1 border rounded text-red-500 hover:bg-red-50"><Trash2 size={12} className="inline mr-1" />Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No suppliers found</div>}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h2><button onClick={() => setModal(null)}><X size={18} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 block mb-1">Company Name *</label><input value={current.company_name_ar} onChange={e => setCurrent({...current, company_name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Category *</label><select value={current.supplier_category} onChange={e => setCurrent({...current, supplier_category: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="pharmacy">Pharmacy</option>
                  <option value="materials">Materials</option>
                  <option value="equipment">Equipment</option>
                  <option value="general">General</option>
                </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Type *</label><select value={current.supplier_type} onChange={e => setCurrent({...current, supplier_type: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="vendor">Vendor</option>
                  <option value="distributor">Distributor</option>
                  <option value="manufacturer">Manufacturer</option>
                </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Phone *</label><input value={current.phone} onChange={e => setCurrent({...current, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Contact Person</label><input value={current.contact_person || ''} onChange={e => setCurrent({...current, contact_person: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Email</label><input value={current.email || ''} onChange={e => setCurrent({...current, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">City</label><input value={current.city || ''} onChange={e => setCurrent({...current, city: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Country</label><select value={current.country || ''} onChange={e => setCurrent({...current, country: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Address</label><input value={current.addressline1 || ''} onChange={e => setCurrent({...current, addressline1: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Credit Limit</label><input type="number" value={current.credit_limit || 0} onChange={e => setCurrent({...current, credit_limit: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Currency</label><select value={current.currency || 'USD'} onChange={e => setCurrent({...current, currency: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Payment Terms</label><input value={current.payment_terms || ''} onChange={e => setCurrent({...current, payment_terms: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={current.isactive} onChange={e => setCurrent({...current, isactive: e.target.checked})} /><label className="text-sm">Active</label></div>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">{current.company_name_ar}</h2></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Code</span>{current.code}</div>
              <div><span className="text-gray-500 block text-xs">Category</span>{catLabel[current.supplier_category] || current.supplier_category}</div>
              <div><span className="text-gray-500 block text-xs">Type</span>{current.supplier_type}</div>
              <div><span className="text-gray-500 block text-xs">Phone</span>{current.phone}</div>
              <div><span className="text-gray-500 block text-xs">Email</span>{current.email || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Contact</span>{current.contact_person || '-'}</div>
              <div><span className="text-gray-500 block text-xs">City</span>{current.city || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Country</span>{current.country || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Address</span>{current.addressline1 || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Credit Limit</span>{current.credit_limit ? fmt(current.credit_limit) + ' ' + current.currency : '-'}</div>
              <div><span className="text-gray-500 block text-xs">Payment Terms</span>{current.payment_terms || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Status</span>{current.isactive ? <span className="text-emerald-600">Active</span> : <span className="text-amber-600">Inactive</span>}</div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Supplier?</h3>
            <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium" disabled={loading}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
