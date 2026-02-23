'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Phone, MapPin, Calendar } from 'lucide-react';

// Mock data - in production, this would come from the API
const mockPatients = [
  {
    patient_id: '1',
    patient_number: 'P-2024-00001',
    first_name_ar: 'أحمد',
    last_name_ar: 'محمد',
    first_name_en: 'Ahmed',
    last_name_en: 'Mohammed',
    full_name_ar: 'أحمد محمد',
    full_name_en: 'Ahmed Mohammed',
    date_of_birth: '1990-01-01',
    gender: 'MALE',
    phone: '+9647701234567',
    email: 'ahmed@example.com',
    governorate: 'بغداد',
    total_balance: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    patient_id: '2',
    patient_number: 'P-2024-00002',
    first_name_ar: 'فاطمة',
    last_name_ar: 'علي',
    first_name_en: 'Fatima',
    last_name_en: 'Ali',
    full_name_ar: 'فاطمة علي',
    full_name_en: 'Fatima Ali',
    date_of_birth: '1985-05-15',
    gender: 'FEMALE',
    phone: '+9647709876543',
    email: 'fatima@example.com',
    governorate: 'البصرة',
    total_balance: 25000,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
  },
];

export default function ReceptionPatients() {
  const [patients, setPatients] = useState(mockPatients);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [currentPatient, setCurrentPatient] = useState<any>(null);

  const filteredPatients = patients.filter(p => 
    p.full_name_ar.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name_en?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_number.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const openCreate = () => {
    setCurrentPatient({
      patient_id: '',
      patient_number: '',
      first_name_ar: '',
      last_name_ar: '',
      first_name_en: '',
      last_name_en: '',
      date_of_birth: '',
      gender: 'MALE',
      phone: '',
      email: '',
      governorate: '',
    });
    setModal('create');
  };

  const openEdit = (patient: any) => {
    setCurrentPatient({ ...patient });
    setModal('edit');
  };

  const openView = (patient: any) => {
    setCurrentPatient(patient);
    setModal('view');
  };

  const handleSave = async () => {
    // Mock save function - in production, this would call the API
    console.log('Saving patient:', currentPatient);
    
    if (modal === 'create') {
      const newPatient = {
        ...currentPatient,
        patient_id: Date.now().toString(),
        patient_number: `P-2024-${String(patients.length + 1).padStart(5, '0')}`,
        full_name_ar: `${currentPatient.first_name_ar} ${currentPatient.last_name_ar}`,
        full_name_en: currentPatient.first_name_en && currentPatient.last_name_en 
          ? `${currentPatient.first_name_en} ${currentPatient.last_name_en}` 
          : '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setPatients([...patients, newPatient]);
    } else if (modal === 'edit') {
      setPatients(patients.map(p => 
        p.patient_id === currentPatient.patient_id 
          ? { ...currentPatient, full_name_ar: `${currentPatient.first_name_ar} ${currentPatient.last_name_ar}` }
          : p
      ));
    }
    
    setModal(null);
  };

  const handleDelete = async (patientId: string) => {
    if (confirm('Are you sure you want to delete this patient?')) {
      setPatients(patients.filter(p => p.patient_id !== patientId));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-500 text-sm">{patients.length} registered patients</p>
        </div>
        <button 
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Patients List */}
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
              {filteredPatients.map((patient) => (
                <tr key={patient.patient_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{patient.patient_number}</td>
                  <td className="px-4 py-3 font-medium">{patient.full_name_ar}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.full_name_en || '-'}</td>
                  <td className="px-4 py-3">{patient.phone}</td>
                  <td className="px-4 py-3">{patient.governorate || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {patient.total_balance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => openView(patient)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => openEdit(patient)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(patient.patient_id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y">
          {filteredPatients.map((patient) => (
            <div key={patient.patient_id} className="p-4 cursor-pointer hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{patient.full_name_ar}</div>
                  <div className="text-xs text-gray-500">{patient.patient_number}</div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openView(patient)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => openEdit(patient)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone size={10} />
                  {patient.phone}
                </span>
                {patient.governorate && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {patient.governorate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {(modal === 'create' || modal === 'edit' || modal === 'view') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === 'create' ? 'Add Patient' : modal === 'edit' ? 'Edit Patient' : 'Patient Details'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name (AR)</label>
                  <input
                    type="text"
                    value={currentPatient?.first_name_ar || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, first_name_ar: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name (AR)</label>
                  <input
                    type="text"
                    value={currentPatient?.last_name_ar || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, last_name_ar: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name (EN)</label>
                  <input
                    type="text"
                    value={currentPatient?.first_name_en || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, first_name_en: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name (EN)</label>
                  <input
                    type="text"
                    value={currentPatient?.last_name_en || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, last_name_en: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={currentPatient?.date_of_birth || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, date_of_birth: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select
                    value={currentPatient?.gender || 'MALE'}
                    onChange={(e) => setCurrentPatient({...currentPatient, gender: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={currentPatient?.phone || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={currentPatient?.email || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Governorate</label>
                  <input
                    type="text"
                    value={currentPatient?.governorate || ''}
                    onChange={(e) => setCurrentPatient({...currentPatient, governorate: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
              </div>
            </div>
            
            {modal !== 'view' && (
              <div className="p-4 border-t flex gap-2 justify-end">
                <button 
                  onClick={() => setModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
