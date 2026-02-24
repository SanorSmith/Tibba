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

  useEffect(() => {
    const mainWrapper = document.querySelector('.main-wrapper') as HTMLElement;
    if (mainWrapper) {
      if (modal === 'create' || modal === 'edit') {
        mainWrapper.style.padding = '16px';
      } else {
        mainWrapper.style.padding = '';
      }
    }
    return () => {
      if (mainWrapper) {
        mainWrapper.style.padding = '';
      }
    };
  }, [modal]);

  const loadPatients = async () => {
    try {
      // Fetch from Tibbna Non-Medical DB
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
        toast.success(`Loaded ${mappedPatients.length} patients from Tibbna Non-Medical DB`);
      }
    } catch (error) {
      console.error('Failed to load patients from Tibbna Non-Medical DB:', error);
      toast.error('Failed to load patients from Tibbna Non-Medical DB');
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
    if (!current.phone || !current.date_of_birth || !current.gender) { 
      toast.error('Please fill required fields'); 
      return; 
    }

    console.log('💾 Current state before save:', current);

    try {
      const patientData = {
        first_name_ar: current.first_name_ar || current.first_name_en || '',
        last_name_ar: current.last_name_ar || current.last_name_en || '',
        first_name_en: current.first_name_en || '',
        middle_name: current.middle_name || '',
        last_name_en: current.last_name_en || '',
        date_of_birth: current.date_of_birth,
        gender: current.gender,
        blood_group: current.blood_group,
        phone: current.phone,
        email: current.email,
        national_id: current.national_id,
        governorate: current.governorate,
        medical_history: current.medical_history,
      };

      console.log('📤 Sending patient data:', patientData);

      if (modal === 'create') {
        const res = await fetch('/api/tibbna-openehr-patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientData),
        });
        
        if (res.ok) {
          toast.success('Patient added to Tibbna Non-Medical DB');
          loadPatients();
          setModal(null);
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to add patient to Tibbna Non-Medical DB');
        }
      } else {
        const res = await fetch('/api/tibbna-openehr-patients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patientData, patient_id: current.patient_id }),
        });
        
        if (res.ok) {
          toast.success('Patient updated in Tibbna Non-Medical DB');
          loadPatients();
          setModal(null);
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to update patient in Tibbna Non-Medical DB');
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
        toast.success('Patient deleted from Tibbna Non-Medical DB');
        loadPatients();
        setDeleteId(null);
      } else {
        toast.error('Failed to delete patient from Tibbna Non-Medical DB');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient');
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className={modal === null ? "p-4 lg:p-6 space-y-6" : "space-y-6"}>
      {modal === null && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Patients</h1>
              <p className="text-gray-500 text-sm">{patients.length} registered patients</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  🏥 Tibbna Non-Medical DB
                </span>
                <span className="text-xs text-gray-400">Connected to Non-Medical database</span>
              </div>
            </div>
            <button onClick={openCreate} className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit">
              <Plus size={16} /> Add Patient
            </button>
          </div>

          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

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
                      <td className="px-4 py-3 text-gray-600">{p.full_name_en}</td>
                      <td className="px-4 py-3">{p.phone}</td>
                      <td className="px-4 py-3">{p.governorate}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{p.total_balance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openView(p)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => { setDeleteId(p.patient_id); }} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y">
              {filtered.map(p => (
                <div key={p.patient_id} className="p-4 cursor-pointer hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{p.full_name_ar}</div>
                      <div className="text-xs text-gray-500">{p.patient_number}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {p.phone && <span className="flex items-center gap-1"><Phone size={10} />{p.phone}</span>}
                    {p.governorate && <span className="flex items-center gap-1"><MapPin size={10} />{p.governorate}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Form */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="bg-white rounded-xl h-[calc(100vh-80px)]" style={{width: 'calc(100% + 400px)', maxWidth: 'none', marginLeft: '-200px', marginRight: '-200px'}} onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">{modal === 'create' ? 'Add Patient' : 'Edit Patient'}</h2>
            <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-muted/50 rounded-xl p-3">
              <form className="space-y-4">
                {/* Personal Information Section */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        value={current.first_name_en || ''} 
                        onChange={e => setCurrent({...current, first_name_en: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">Middle name</label>
                      <input 
                        value={current.middle_name || ''} 
                        onChange={e => setCurrent({...current, middle_name: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="A."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        Last name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        value={current.last_name_en || ''} 
                        onChange={e => setCurrent({...current, last_name_en: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        National ID <span className="text-red-500">*</span>
                      </label>
                      <input 
                        value={current.national_id || ''} 
                        onChange={e => setCurrent({...current, national_id: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="ID number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Demographics Section */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Demographics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        value={current.date_of_birth} 
                        onChange={e => setCurrent({...current, date_of_birth: e.target.value})} 
                        className="flex h-11 w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={current.gender} 
                        onChange={e => setCurrent({...current, gender: e.target.value as 'MALE'|'FEMALE'})} 
                        className="flex h-11 w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        Telephone <span className="text-red-500">*</span>
                      </label>
                      <input 
                        value={current.phone} 
                        onChange={e => setCurrent({...current, phone: e.target.value})} 
                        className="flex h-11 w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="+1 555 555"
                        type="tel"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">Blood Group</label>
                      <select 
                        value={current.blood_group || ''} 
                        onChange={e => setCurrent({...current, blood_group: e.target.value})} 
                        className="flex h-11 w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                      >
                        <option value="">Select blood group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">Email</label>
                      <input 
                        type="email" 
                        value={current.email || ''} 
                        onChange={e => setCurrent({...current, email: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="name@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">Address</label>
                      <input 
                        value={current.governorate || ''} 
                        onChange={e => setCurrent({...current, governorate: e.target.value})} 
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors" 
                        placeholder="123 Main St"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical History Section */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-1">Medical History</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">Medical History</label>
                    <textarea 
                      value={current.medical_history || ''} 
                      onChange={e => setCurrent({...current, medical_history: e.target.value})} 
                      className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors resize-y" 
                      rows={3}
                      placeholder="Notes, conditions, allergies, medications..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button 
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                  >
                    {modal === 'create' ? 'Register Patient' : 'Update Patient'}
                  </button>
                </div>
              </form>
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
