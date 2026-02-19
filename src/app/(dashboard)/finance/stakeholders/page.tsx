'use client';

import { useEffect, useState, useMemo } from 'react';
import { Handshake, Plus, Search, Edit, Trash2, Eye, X, DollarSign } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { Stakeholder, StakeholderRole } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const roles: StakeholderRole[] = ['HOSPITAL','DOCTOR','NURSE','ANESTHESIOLOGIST','LAB_TECHNICIAN','PHARMACIST','OUTSOURCE_DOCTOR','OTHER_HEALTHCARE_WORKER'];
const roleLabel: Record<string, string> = { HOSPITAL: 'Hospital', DOCTOR: 'Doctor', NURSE: 'Nurse', ANESTHESIOLOGIST: 'Anesthesiologist', LAB_TECHNICIAN: 'Lab Technician', PHARMACIST: 'Pharmacist', OUTSOURCE_DOCTOR: 'External Doctor', OTHER_HEALTHCARE_WORKER: 'Other' };

export default function StakeholdersPage() {
  const [list, setList] = useState<Stakeholder[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<'create'|'edit'|'view'|null>(null);
  const [current, setCurrent] = useState<Stakeholder | null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);
  const reload = () => setList(financeStore.getStakeholders());

  const filtered = useMemo(() => {
    let f = list;
    if (roleFilter !== 'ALL') f = f.filter(s => s.role === roleFilter);
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.name_ar.includes(q) || (s.name_en||'').toLowerCase().includes(q) || s.stakeholder_code.toLowerCase().includes(q)); }
    return f;
  }, [list, search, roleFilter]);

  const shareStats = useMemo(() => {
    const shares = financeStore.getInvoiceShares();
    const byStakeholder: Record<string, { total: number; paid: number; pending: number }> = {};
    shares.forEach(s => {
      if (!byStakeholder[s.stakeholder_id]) byStakeholder[s.stakeholder_id] = { total: 0, paid: 0, pending: 0 };
      byStakeholder[s.stakeholder_id].total += s.share_amount;
      if (s.payment_status === 'PAID') byStakeholder[s.stakeholder_id].paid += s.amount_paid;
      else byStakeholder[s.stakeholder_id].pending += s.share_amount;
    });
    return byStakeholder;
  }, [list]);

  const empty = (): Stakeholder => ({
    stakeholder_id: `sh-${Date.now()}`, stakeholder_code: `SH-2024-${String(Math.floor(Math.random()*999)).padStart(3,'0')}`,
    name_ar: '', role: 'DOCTOR', mobile: '', default_share_type: 'PERCENTAGE', default_share_percentage: 0,
    is_active: true, created_at: new Date().toISOString(),
  });

  const openCreate = () => { setCurrent(empty()); setModal('create'); };
  const openEdit = (s: Stakeholder) => { setCurrent({...s}); setModal('edit'); };
  const openView = (s: Stakeholder) => { setCurrent(s); setModal('view'); };

  const handleSave = () => {
    if (!current || !current.name_ar || !current.mobile) { toast.error('Fill required fields'); return; }
    if (modal === 'create') { financeStore.addStakeholder(current); toast.success('Stakeholder added'); }
    else { financeStore.updateStakeholder(current.stakeholder_id, current); toast.success('Stakeholder updated'); }
    reload(); setModal(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    financeStore.deleteStakeholder(deleteId); toast.success('Deleted'); reload(); setDeleteId(null);
  };

  const roleColor = (r: string) => {
    switch(r) { case 'HOSPITAL': return 'bg-blue-100 text-blue-700'; case 'DOCTOR': return 'bg-emerald-100 text-emerald-700'; case 'NURSE': return 'bg-pink-100 text-pink-700'; case 'ANESTHESIOLOGIST': return 'bg-purple-100 text-purple-700'; case 'OUTSOURCE_DOCTOR': return 'bg-orange-100 text-orange-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Stakeholders & Revenue Sharing</h1><p className="text-gray-500 text-sm">{list.length} stakeholders registered</p></div>
        <button onClick={openCreate} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit"><Plus size={16} /> Add Stakeholder</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="ALL">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const ss = shareStats[s.stakeholder_id];
          return (
            <div key={s.stakeholder_id} className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer" onClick={() => openView(s)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{s.name_ar}</div>
                  {s.name_en && <div className="text-xs text-gray-500">{s.name_en}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">{s.stakeholder_code}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(s.role)}`}>{roleLabel[s.role]}</span>
              </div>
              {s.specialty_ar && <div className="text-xs text-gray-600 mb-2">{s.specialty_ar}</div>}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Default: {s.default_share_type === 'PERCENTAGE' ? `${s.default_share_percentage}%` : `${fmt(s.default_share_amount || 0)} IQD`}</span>
                {ss && <span className="font-medium text-gray-900">{fmt(ss.total)} IQD total</span>}
              </div>
              {ss && ss.pending > 0 && <div className="text-[10px] text-gray-600 mt-1">Pending: {fmt(ss.pending)} IQD</div>}
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="text-xs px-2 py-1 border rounded hover:bg-gray-50"><Edit size={12} className="inline mr-1" />Edit</button>
                <button onClick={e => { e.stopPropagation(); setDeleteId(s.stakeholder_id); }} className="text-xs px-2 py-1 border rounded text-red-500 hover:bg-red-50"><Trash2 size={12} className="inline mr-1" />Delete</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No stakeholders found</div>}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && current && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">{modal === 'create' ? 'Add Stakeholder' : 'Edit Stakeholder'}</h2><button onClick={() => setModal(null)}><X size={18} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 block mb-1">Name (AR) *</label><input value={current.name_ar} onChange={e => setCurrent({...current, name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Name (EN)</label><input value={current.name_en||''} onChange={e => setCurrent({...current, name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Role *</label><select value={current.role} onChange={e => setCurrent({...current, role: e.target.value as StakeholderRole})} className="w-full border rounded-lg px-3 py-2 text-sm">{roles.map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Mobile *</label><input value={current.mobile} onChange={e => setCurrent({...current, mobile: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Specialty (AR)</label><input value={current.specialty_ar||''} onChange={e => setCurrent({...current, specialty_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">License #</label><input value={current.license_number||''} onChange={e => setCurrent({...current, license_number: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Default Share %</label><input type="number" value={current.default_share_percentage||0} onChange={e => setCurrent({...current, default_share_percentage: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Bank Name</label><input value={current.bank_name_ar||''} onChange={e => setCurrent({...current, bank_name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
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
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">{current.name_ar}</h2><div className="flex items-center gap-2 mt-1"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(current.role)}`}>{roleLabel[current.role]}</span><span className="text-xs text-gray-400">{current.stakeholder_code}</span></div></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Name (EN)</span>{current.name_en||'-'}</div>
              <div><span className="text-gray-500 block text-xs">Specialty</span>{current.specialty_ar||'-'}</div>
              <div><span className="text-gray-500 block text-xs">Mobile</span>{current.mobile}</div>
              <div><span className="text-gray-500 block text-xs">License</span>{current.license_number||'-'}</div>
              <div><span className="text-gray-500 block text-xs">Default Share</span>{current.default_share_percentage}%</div>
              <div><span className="text-gray-500 block text-xs">Bank</span>{current.bank_name_ar||'-'}</div>
            </div>
            {/* Share History */}
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Revenue Share History</h3>
              <div className="border rounded-lg divide-y text-sm max-h-48 overflow-y-auto">
                {financeStore.getSharesByStakeholder(current.stakeholder_id).map(sh => (
                  <div key={sh.share_id} className="p-3 flex justify-between">
                    <div><div className="text-xs text-gray-500">Invoice: {sh.invoice_id}</div><div className="text-xs">{sh.share_percentage}% share</div></div>
                    <div className="text-right"><div className="font-medium">{fmt(sh.share_amount)} IQD</div><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sh.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{sh.payment_status}</span></div>
                  </div>
                ))}
                {financeStore.getSharesByStakeholder(current.stakeholder_id).length === 0 && <div className="p-3 text-center text-gray-400">No shares yet</div>}
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Stakeholder?</h3>
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
