'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Eye, X, Phone, MapPin } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { FinancePatient } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

const emptyPatient = (): FinancePatient => ({
  patient_id: `fp-${Date.now()}`,
  patient_number: `P-2024-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
  first_name_ar: '', last_name_ar: '', full_name_ar: '',
  date_of_birth: '', gender: 'MALE', phone: '',
  total_balance: 0, is_active: true, created_at: new Date().toISOString(),
});

export default function PatientsPage() {
  const [patients, setPatients] = useState<FinancePatient[]>([]);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [current, setCurrent] = useState<FinancePatient>(emptyPatient());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadPatients(); setMounted(true); }, []);
  
  const loadPatients = async () => {
    try {
      // Fetch from Tibbna OpenEHR DB
      const res = await fetch('/api/tibbna-openehr-patients');
      if (res.ok) {
        const response = await res.json();
        
        // API now returns raw array of patients
        const rawPatients = Array.isArray(response) ? response : (response.data || []);
        
        // Map to Finance app format
        const mappedPatients = rawPatients.map((p: any) => ({
          patient_id: p.patientid || p.patient_id || p.id,
          patient_number: p.patientid || p.patient_number || p.id,
          first_name_ar: p.firstname || p.first_name_ar || '',
          last_name_ar: p.lastname || p.last_name_ar || '',
          full_name_ar: `${p.firstname || p.first_name_ar || ''} ${p.lastname || p.last_name_ar || ''}`.trim(),
          first_name_en: p.firstname || p.first_name_en || '',
          last_name_en: p.lastname || p.last_name_en || '',
          full_name_en: `${p.firstname || p.first_name_en || ''} ${p.lastname || p.last_name_en || ''}`.trim(),
          date_of_birth: p.dateofbirth || p.date_of_birth || '',
          gender: p.gender || 'MALE',
          phone: p.phone || '',
          email: p.email || '',
          national_id: p.nationalid || p.national_id || '',
          governorate: p.address || p.governorate || '',
          total_balance: 0,
          is_active: true,
          created_at: p.createdat || p.created_at || new Date().toISOString(),
          id: p.patientid || p.id,
        }));
        
        setPatients(mappedPatients);
        toast.success(`Loaded ${mappedPatients.length} patients from Tibbna OpenEHR DB`);
      }
    } catch (error) {
      console.error('Failed to load patients from Tibbna OpenEHR DB:', error);
      toast.error('Failed to load patients from Tibbna OpenEHR DB');
    }
  };

  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => p.full_name_ar.includes(q) || p.patient_number.toLowerCase().includes(q) || (p.full_name_en || '').toLowerCase().includes(q) || p.phone.includes(q));
  }, [patients, search]);

  const openCreate = () => { setCurrent(emptyPatient()); setModal('create'); };
  const openEdit = (p: FinancePatient) => { setCurrent({ ...p }); setModal('edit'); };
  const openView = (p: FinancePatient) => { setCurrent(p); setModal('view'); };

  const handleSave = async () => {
    if (!current.first_name_ar || !current.last_name_ar || !current.phone) { 
      toast.error('Please fill required fields'); 
      return; 
    }

    console.log('💾 Current state before save:', current);

    try {
      const patientData = {
        first_name_ar: current.first_name_ar,
        last_name_ar: current.last_name_ar,
        first_name_en: current.first_name_en,
        last_name_en: current.last_name_en,
        date_of_birth: current.date_of_birth,
        gender: current.gender,
        phone: current.phone,
        email: current.email,
        national_id: current.national_id,
        governorate: current.governorate,
      };

      console.log('📤 Sending patient data:', patientData);

      if (modal === 'create') {
        const res = await fetch('/api/tibbna-openehr-patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientData),
        });
        
        if (res.ok) {
          toast.success('Patient added to Tibbna OpenEHR DB');
          loadPatients();
          setModal(null);
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to add patient to Tibbna OpenEHR DB');
        }
      } else {
        const res = await fetch('/api/tibbna-openehr-patients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patientData, patient_id: current.patient_id }),
        });
        
        if (res.ok) {
          toast.success('Patient updated in Tibbna OpenEHR DB');
          loadPatients();
          setModal(null);
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to update patient in Tibbna OpenEHR DB');
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save patient');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const patient = patients.find(p => p.patient_id === deleteId);
      if (!patient) return;

      const res = await fetch(`/api/tibbna-openehr-patients?id=${patient.patient_id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Patient deleted from Tibbna OpenEHR DB');
        loadPatients();
        setDeleteId(null);
      } else {
        toast.error('Failed to delete patient from Tibbna OpenEHR DB');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient');
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-500 text-sm">{patients.length} registered patients</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              🏥 Tibbna OpenEHR DB
            </span>
            <span className="text-xs text-gray-400">Connected to OpenEHR-compliant database</span>
          </div>
        </div>
        <button onClick={openCreate} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit">
          <Plus size={16} /> Add Patient
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name (AR)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name (EN)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Governorate</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance (IQD)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.patient_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.patient_number}</td>
                  <td className="px-4 py-3 font-medium">{p.full_name_ar}</td>
                  <td className="px-4 py-3 text-gray-600">{p.full_name_en || '-'}</td>
                  <td className="px-4 py-3">{p.phone}</td>
                  <td className="px-4 py-3">{p.governorate || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{p.total_balance > 0 ? fmt(p.total_balance) : '0'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openView(p)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14} /></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded"><Edit size={14} /></button>
                      <button onClick={() => setDeleteId(p.patient_id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No patients found</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden divide-y">
          {filtered.map(p => (
            <div key={p.patient_id} className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => openView(p)}>
              <div className="flex justify-between items-start">
                <div><div className="font-medium">{p.full_name_ar}</div><div className="text-xs text-gray-500">{p.patient_number}</div></div>
                {p.total_balance > 0 && <span className="text-xs font-bold text-gray-900">{fmt(p.total_balance)} IQD</span>}
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone size={10} />{p.phone}</span>
                {p.governorate && <span className="flex items-center gap-1"><MapPin size={10} />{p.governorate}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{modal === 'create' ? 'Add Patient' : 'Edit Patient'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 block mb-1">First Name (AR) *</label><input value={current.first_name_ar} onChange={e => setCurrent({...current, first_name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Last Name (AR) *</label><input value={current.last_name_ar} onChange={e => setCurrent({...current, last_name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">First Name (EN)</label><input value={current.first_name_en || ''} onChange={e => setCurrent({...current, first_name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Last Name (EN)</label><input value={current.last_name_en || ''} onChange={e => setCurrent({...current, last_name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Date of Birth *</label><input type="date" value={current.date_of_birth} onChange={e => setCurrent({...current, date_of_birth: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Gender *</label><select value={current.gender} onChange={e => setCurrent({...current, gender: e.target.value as 'MALE'|'FEMALE'})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                <div><label className="text-xs text-gray-500 block mb-1">Phone *</label><input value={current.phone} onChange={e => setCurrent({...current, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">National ID</label><input value={current.national_id || ''} onChange={e => setCurrent({...current, national_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Governorate</label><input value={current.governorate || ''} onChange={e => setCurrent({...current, governorate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="بغداد" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Email</label><input type="email" value={current.email || ''} onChange={e => setCurrent({...current, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">{current.full_name_ar}</h2><p className="text-xs text-gray-500">{current.patient_number}</p></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Name (EN)</span>{current.full_name_en || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Gender</span>{current.gender}</div>
              <div><span className="text-gray-500 block text-xs">Date of Birth</span>{current.date_of_birth}</div>
              <div><span className="text-gray-500 block text-xs">National ID</span>{current.national_id || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Phone</span>{current.phone}</div>
              <div><span className="text-gray-500 block text-xs">Email</span>{current.email || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Governorate</span>{current.governorate || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Balance</span><span className="font-bold text-gray-900">{fmt(current.total_balance)} IQD</span></div>
            </div>
            {/* Patient Invoices - Note: Will be loaded from database in future */}
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Invoices</h3>
              <div className="border rounded-lg p-3 text-sm text-gray-400 text-center">
                Invoice history will be loaded from database
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => { setModal(null); setTimeout(() => openEdit(current), 100); }} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1"><Edit size={14} /> Edit</button>
              <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Patient?</h3>
            <p className="text-sm text-gray-600 mb-4">This will remove the patient record permanently.</p>
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
