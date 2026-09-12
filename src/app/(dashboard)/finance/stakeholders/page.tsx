'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import type { StakeholderRole } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number | string) => new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);

const roles: StakeholderRole[] = [
  'HOSPITAL','DOCTOR','NURSE','ANESTHESIOLOGIST','LAB_TECHNICIAN',
  'PHARMACIST','OUTSOURCE_DOCTOR','OTHER_HEALTHCARE_WORKER',
];
const roleLabel: Record<string, string> = {
  HOSPITAL: 'Hospital', DOCTOR: 'Doctor', NURSE: 'Nurse',
  ANESTHESIOLOGIST: 'Anesthesiologist', LAB_TECHNICIAN: 'Lab Technician',
  PHARMACIST: 'Pharmacist', OUTSOURCE_DOCTOR: 'External Doctor',
  OTHER_HEALTHCARE_WORKER: 'Other',
};
const roleColor = (r: string) => {
  const colors: Record<string, string> = {
    HOSPITAL: 'bg-blue-100 text-blue-700', DOCTOR: 'bg-emerald-100 text-emerald-700',
    NURSE: 'bg-pink-100 text-pink-700', ANESTHESIOLOGIST: 'bg-purple-100 text-purple-700',
    OUTSOURCE_DOCTOR: 'bg-orange-100 text-orange-700',
  };
  return colors[r] || 'bg-gray-100 text-gray-700';
};

interface Stakeholder {
  stakeholder_id: string;
  stakeholder_code: string;
  name_ar: string;
  name_en?: string;
  role: string;
  specialty_ar?: string;
  specialty_en?: string;
  phone?: string;
  mobile: string;
  email?: string;
  license_number?: string;
  license_expiry_date?: string;
  bank_name_ar?: string;
  account_number?: string;
  iban?: string;
  service_type?: string;
  default_share_type: string;
  default_share_percentage?: number;
  default_share_amount?: number;
  is_active: boolean;
  created_at?: string;
}

const emptyStakeholder = (): Partial<Stakeholder> => ({
  stakeholder_code: `SH-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  name_ar: '', role: 'DOCTOR', mobile: '',
  default_share_type: 'PERCENTAGE', default_share_percentage: 0, is_active: true,
});

export default function StakeholdersPage() {
  const [list, setList] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [current, setCurrent] = useState<Partial<Stakeholder> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stakeholders');
      if (res.ok) { const d = await res.json(); setList(d.data || []); } else {
        // Was silent: the request failed and nothing on screen said so.
        const problem = await res.json().catch(() => null);
        toast.error(problem?.error || 'Could not reload');
      }
    } catch { toast.error('Failed to load stakeholders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    let f = list;
    if (roleFilter !== 'ALL') f = f.filter(s => s.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(s =>
        s.name_ar.includes(q) ||
        (s.name_en || '').toLowerCase().includes(q) ||
        s.stakeholder_code.toLowerCase().includes(q) ||
        s.mobile.includes(q)
      );
    }
    return f;
  }, [list, search, roleFilter]);

  const openCreate = () => { setCurrent(emptyStakeholder()); setModal('create'); };
  const openEdit   = (s: Stakeholder) => { setCurrent({ ...s }); setModal('edit'); };
  const openView   = (s: Stakeholder) => { setCurrent(s); setModal('view'); };

  const handleSave = async () => {
    if (!current?.name_ar || !current?.mobile || !current?.role) {
      toast.error('Name, mobile, and role are required'); return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (modal === 'create') {
        res = await fetch('/api/stakeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        });
      } else {
        res = await fetch(`/api/stakeholders/${current.stakeholder_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        });
      }
      const d = await res.json();
      if (!res.ok) { toast.error(d.detail || d.error || 'Failed to save'); return; }
      toast.success(modal === 'create' ? 'Stakeholder created' : 'Stakeholder updated');
      setModal(null);
      reload();
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/stakeholders/${deleteId}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Stakeholder deactivated'); reload(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed to delete'); }
    } catch { toast.error('Network error'); }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="animate-pulse h-40 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stakeholders &amp; Revenue Sharing</h1>
          <p className="text-gray-500 text-sm">{list.length} stakeholders registered</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-600 w-fit"
        >
          <Plus size={16} /> Add Stakeholder
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search name, code, mobile…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div
            key={s.stakeholder_id}
            className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer flex flex-col h-full"
            onClick={() => openView(s)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">{s.name_ar}</div>
                {s.name_en && <div className="text-xs text-gray-400">{s.name_en}</div>}
                <div className="text-xs text-gray-500">{s.stakeholder_code}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(s.role)}`}>
                {roleLabel[s.role] || s.role}
              </span>
            </div>

            <div className="space-y-1.5 mb-3 flex-grow text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mobile:</span>
                <span className="font-medium">{s.mobile}</span>
              </div>
              {s.specialty_ar && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Specialty:</span>
                  <span className="font-medium">{s.specialty_ar}</span>
                </div>
              )}
              {s.service_type && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">{s.service_type.replace(/_/g, ' ')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Share:</span>
                <span className="font-medium">
                  {s.default_share_type === 'PERCENTAGE'
                    ? `${parseFloat(String(s.default_share_percentage)) || 0}%`
                    : `${fmt(s.default_share_amount || 0)} IQD`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`text-xs font-medium ${s.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t mt-auto">
              <button
                onClick={e => { e.stopPropagation(); openView(s); }}
                className="flex-1 text-xs px-2 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 flex items-center justify-center gap-1"
              >
                <Eye size={12} /> View
              </button>
              <button
                onClick={e => { e.stopPropagation(); openEdit(s); }}
                className="flex-1 text-xs px-2 py-1.5 border border-amber-500 text-amber-500 rounded hover:bg-amber-50 flex items-center justify-center gap-1"
              >
                <Edit size={12} /> Edit
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteId(s.stakeholder_id); }}
                className="flex-1 text-xs px-2 py-1.5 border border-red-500 text-red-500 rounded hover:bg-red-50 flex items-center justify-center gap-1"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            {list.length === 0 ? 'No stakeholders yet. Click "Add Stakeholder" to create the first one.' : 'No results match your search.'}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{modal === 'create' ? 'Add Stakeholder' : 'Edit Stakeholder'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Stakeholder Code</label>
                  <input
                    value={current.stakeholder_code || ''}
                    onChange={e => setCurrent({ ...current, stakeholder_code: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'edit'}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role *</label>
                  <select
                    value={current.role || 'DOCTOR'}
                    onChange={e => setCurrent({ ...current, role: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {roles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name (Arabic) *</label>
                  <input
                    value={current.name_ar || ''}
                    onChange={e => setCurrent({ ...current, name_ar: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name (English)</label>
                  <input
                    value={current.name_en || ''}
                    onChange={e => setCurrent({ ...current, name_en: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Mobile *</label>
                  <input value={current.mobile || ''} onChange={e => setCurrent({ ...current, mobile: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Phone</label>
                  <input value={current.phone || ''} onChange={e => setCurrent({ ...current, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input type="email" value={current.email || ''} onChange={e => setCurrent({ ...current, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Specialty</label>
                  <input value={current.specialty_ar || ''} onChange={e => setCurrent({ ...current, specialty_ar: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g., Cardiology" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">License Number</label>
                  <input value={current.license_number || ''} onChange={e => setCurrent({ ...current, license_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Service Type</label>
                  <select value={current.service_type || ''} onChange={e => setCurrent({ ...current, service_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select…</option>
                    {['CONSULTATION','SURGERY','EXAMINATION','DIAGNOSTIC','TREATMENT','PROCEDURE','THERAPY','NURSING_CARE','LAB_SERVICES','RADIOLOGY','PHARMACY','ANESTHESIA','EMERGENCY','INTENSIVE_CARE','OTHER'].map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select value={current.is_active ? 'ACTIVE' : 'INACTIVE'} onChange={e => setCurrent({ ...current, is_active: e.target.value === 'ACTIVE' })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Bank Name</label>
                  <input value={current.bank_name_ar || ''} onChange={e => setCurrent({ ...current, bank_name_ar: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Account Number</label>
                  <input value={current.account_number || ''} onChange={e => setCurrent({ ...current, account_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">IBAN</label>
                  <input value={current.iban || ''} onChange={e => setCurrent({ ...current, iban: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Share Type</label>
                  <select value={current.default_share_type || 'PERCENTAGE'} onChange={e => setCurrent({ ...current, default_share_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {current.default_share_type === 'PERCENTAGE' ? 'Share %' : 'Share Amount (IQD)'}
                  </label>
                  <input
                    type="number"
                    step={current.default_share_type === 'PERCENTAGE' ? '0.01' : '1000'}
                    value={(current.default_share_type === 'PERCENTAGE' ? current.default_share_percentage : current.default_share_amount) || 0}
                    onChange={e => setCurrent({
                      ...current,
                      ...(current.default_share_type === 'PERCENTAGE'
                        ? { default_share_percentage: Number(e.target.value) }
                        : { default_share_amount: Number(e.target.value) }
                      ),
                    })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Saving…' : modal === 'create' ? 'Create Stakeholder' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{current.name_ar}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(current.role || '')}`}>
                  {roleLabel[current.role || ''] || current.role}
                </span>
                <span className="text-xs text-gray-400">{current.stakeholder_code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${current.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {current.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-gray-500 block">Name (EN)</span>{current.name_en || '-'}</div>
                <div><span className="text-xs text-gray-500 block">Mobile</span>{current.mobile}</div>
                <div><span className="text-xs text-gray-500 block">Email</span>{current.email || '-'}</div>
                <div><span className="text-xs text-gray-500 block">Phone</span>{current.phone || '-'}</div>
                <div><span className="text-xs text-gray-500 block">Specialty</span>{current.specialty_ar || '-'}</div>
                <div><span className="text-xs text-gray-500 block">License</span>{current.license_number || '-'}</div>
                <div><span className="text-xs text-gray-500 block">Service Type</span>{current.service_type?.replace(/_/g, ' ') || '-'}</div>
                <div>
                  <span className="text-xs text-gray-500 block">Share</span>
                  {current.default_share_type === 'PERCENTAGE'
                    ? `${current.default_share_percentage || 0}%`
                    : `${fmt(current.default_share_amount || 0)} IQD`
                  }
                </div>
                <div><span className="text-xs text-gray-500 block">Bank</span>{current.bank_name_ar || '-'}</div>
                <div><span className="text-xs text-gray-500 block">Account</span>{current.account_number || '-'}</div>
                <div><span className="text-xs text-gray-500 block">IBAN</span>{current.iban || '-'}</div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              <button onClick={() => setModal('edit')} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Deactivate Stakeholder?</h3>
            <p className="text-sm text-gray-600 mb-4">The stakeholder will be marked as inactive and hidden from new assignments.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
