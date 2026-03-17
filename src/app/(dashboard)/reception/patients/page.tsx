'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Eye, X, Phone, MapPin, RefreshCw } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { FinancePatient } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

const emptyPatient = (): FinancePatient => ({
  patient_id: `fp-${Date.now()}`,
  patient_number: `P-2024-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
  first_name_ar: '', last_name_ar: '', full_name_ar: '',
  date_of_birth: '', gender: 'MALE', phone: '',
  emergency_contact: '', emergency_phone: '',
  allergies: '', chronic_diseases: '', current_medications: '', medical_history: '',
  total_balance: 0, is_active: true, created_at: new Date().toISOString(),
});

export default function PatientsPage() {
  const [patients, setPatients] = useState<FinancePatient[]>([]);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [current, setCurrent] = useState<FinancePatient>(emptyPatient());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<FinancePatient | null>(null);
  const [searchedPatient, setSearchedPatient] = useState<FinancePatient | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editablePatient, setEditablePatient] = useState<FinancePatient | null>(null);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);

  useEffect(() => { 
    loadPatients(); 
    loadInsuranceCompanies(); 
    setMounted(true); 
  }, []);

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
          patient_number: p.patientNumber || p.patient_number || p.patientid || p.id,
          first_name_ar: p.firstNameAr || p.firstname || p.first_name_ar || '',
          last_name_ar: p.lastNameAr || p.lastname || p.last_name_ar || '',
          full_name_ar: `${p.firstNameAr || p.firstname || p.first_name_ar || ''} ${p.lastNameAr || p.lastname || p.last_name_ar || ''}`.trim(),
          first_name_en: p.firstNameEn || p.firstname || p.first_name_en || '',
          last_name_en: p.lastNameEn || p.lastname || p.last_name_en || '',
          full_name_en: `${p.firstNameEn || p.firstname || p.first_name_en || ''} ${p.lastNameEn || p.lastname || p.last_name_en || ''}`.trim(),
          date_of_birth: p.dateOfBirth || p.dateofbirth || p.date_of_birth || '',
          gender: p.gender || 'MALE',
          phone: p.phone || '',
          email: p.email || '',
          national_id: p.nationalId || p.nationalid || p.national_id || '',
          governorate: p.address || p.governorate || '',
          total_balance: 0,
          is_active: true,
          created_at: p.createdAt || p.createdat || p.created_at || new Date().toISOString(),
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

  const loadInsuranceCompanies = async () => {
    try {
      // Fetch insurance companies - we need to determine the correct API endpoint
      // For now, let's try to fetch from a potential insurance companies API
      const res = await fetch('/api/insurance-companies');
      if (res.ok) {
        const companies = await res.json();
        setInsuranceCompanies(Array.isArray(companies) ? companies : (companies.data || []));
      } else {
        // If API doesn't exist, we'll use a fallback approach
        console.log('Insurance companies API not available, using fallback');
        // You might need to create this API endpoint or use a different approach
        setInsuranceCompanies([]);
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
      setInsuranceCompanies([]);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(p => p.full_name_ar.includes(q) || p.patient_number.toLowerCase().includes(q) || (p.full_name_en || '').toLowerCase().includes(q) || p.phone.includes(q));
  }, [patients, search]);

  const dropdownSuggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return patients.filter(p => 
      p.full_name_ar.toLowerCase().includes(q) || 
      (p.full_name_en || '').toLowerCase().includes(q) ||
      p.patient_number.toLowerCase().includes(q)
    ).slice(0, 8); // Limit to 8 suggestions
  }, [patients, search]);

  const handlePatientSelect = (patient: FinancePatient) => {
    setSelectedPatient(patient);
    setSearch(patient.full_name_ar);
    setShowDropdown(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      // Search using the API to get fresh data with all fields
      const res = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(search.trim())}`);
      if (res.ok) {
        const response = await res.json();
        const foundPatients = Array.isArray(response.data) ? response.data : response;
        
        if (foundPatients.length > 0) {
          // Prioritize patients with related data (emergency contact, insurance, or medical info)
          const patientWithRelatedData = foundPatients.find((p: any) => 
            p.emergency_contact || p.emergency_phone || 
            p.insurance_company || p.insurance_number ||
            p.allergies || p.chronic_diseases || p.current_medications
          );
          
          const foundPatient = patientWithRelatedData || foundPatients[0];
          setSearchedPatient(foundPatient);
          
          if (patientWithRelatedData) {
            toast.success(`Patient found with complete data: ${foundPatient.full_name_ar}`);
          } else {
            toast.success(`Patient found: ${foundPatient.full_name_ar} (limited data)`);
          }
        } else {
          setSearchedPatient(null);
          toast.error('No patient found with the given criteria');
        }
      } else {
        // Fallback to local search if API fails
        const foundPatient = patients.find(p => 
          p.full_name_ar.toLowerCase().includes(search.toLowerCase()) ||
          (p.full_name_en || '').toLowerCase().includes(search.toLowerCase()) ||
          p.patient_number.toLowerCase().includes(search.toLowerCase()) ||
          p.phone.includes(search) ||
          (p.national_id || '').includes(search)
        );

        if (foundPatient) {
          setSearchedPatient(foundPatient);
          toast.success(`Patient found: ${foundPatient.full_name_ar}`);
        } else {
          setSearchedPatient(null);
          toast.error('No patient found with the given criteria');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    }
  };

  const openCreate = () => { window.location.href = '/reception/new'; };
  const openEdit = (p: FinancePatient) => { setCurrent({ ...p }); setModal('edit'); };
  const openView = (p: FinancePatient) => { setCurrent(p); setModal('view'); };

  const handleEdit = () => {
    if (!searchedPatient) {
      toast.error('Please search and select a patient first');
      return;
    }
    setEditablePatient({ 
      ...searchedPatient,
      date_of_birth: searchedPatient.date_of_birth ? new Date(searchedPatient.date_of_birth).toISOString().split('T')[0] : ''
    });
    setEditMode(true);
    toast.success('Edit mode activated - You can now modify patient information');
  };

  const handleSaveEdit = async () => {
    if (!editablePatient) return;
    
    try {
      const patientData = {
        // Send only one value per database column to avoid duplicates
        first_name_ar: editablePatient.first_name_ar || editablePatient.first_name_en || '',
        middle_name: editablePatient.middle_name || '',
        last_name_ar: editablePatient.last_name_ar || editablePatient.last_name_en || '',
        date_of_birth: editablePatient.date_of_birth,
        gender: editablePatient.gender,
        blood_group: editablePatient.blood_group,
        phone: editablePatient.phone,
        email: editablePatient.email,
        national_id: editablePatient.national_id,
        governorate: editablePatient.governorate,
        // Add insurance fields
        insurance_company: editablePatient.insurance_company || '',
        insurance_number: editablePatient.insurance_number || '',
        insurance_state: editablePatient.insurance_state || 'Not Available',
        // Add emergency contact fields
        emergency_contact: editablePatient.emergency_contact || '',
        emergency_phone: editablePatient.emergency_contact_phone || '',
        // Add medical information fields
        allergies: editablePatient.allergies || '',
        chronic_diseases: editablePatient.chronic_diseases || '',
        current_medications: editablePatient.current_medications || '',
        medical_history: editablePatient.medical_history || '',
      };

      const res = await fetch('/api/tibbna-openehr-patients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editablePatient.patient_id, ...patientData }),
      });

      if (res.ok) {
        toast.success('Patient information updated successfully');
        setSearchedPatient({ ...editablePatient });
        setEditMode(false);
        setEditablePatient(null);
        loadPatients(); // Refresh patient list
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update patient');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update patient');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditablePatient(null);
    toast.info('Edit mode cancelled');
  };

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

          
          {/* Patient Search Viewer Section */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Patient Search</h2>
              <p className="text-xs text-gray-600 mt-1">Search by Patient ID, National ID, or Phone Number</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                  <input 
                    placeholder="Search patients..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {/* Dropdown Suggestions */}
                  {showDropdown && dropdownSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                      {dropdownSuggestions.map((patient, index) => (
                        <div
                          key={patient.patient_id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{patient.full_name_ar}</div>
                              <div className="text-sm text-gray-500">{patient.full_name_en || ''}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-blue-600">{patient.patient_number}</div>
                              <div className="text-xs text-gray-400">{patient.phone}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                    <input 
                      placeholder="Select medical staff (optional)" 
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      type="text" 
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 max-w-2xl">
                <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                  <Search size={16} />
                  Search
                </button>
                                <button 
                    onClick={handleEdit}
                    disabled={!searchedPatient}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                </button>
              </div>

              {/* Patient Information Display */}
              <div className="bg-white rounded-lg border">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">Patient Information</h2>
                  <p className="text-xs text-gray-600 mt-1">View detailed patient records</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patient ID</label>
                        <input readOnly value={editMode ? editablePatient?.patient_number || '' : searchedPatient?.patient_number || ''} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">First Name</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.first_name_ar || '' : searchedPatient?.first_name_ar || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, first_name_ar: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Middle Name</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.middle_name || '' : searchedPatient?.middle_name || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, middle_name: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Last Name</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.last_name_ar || '' : searchedPatient?.last_name_ar || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, last_name_ar: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Demographics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date of Birth</label>
                        <input readOnly={!editMode} value={editMode ? (editablePatient?.date_of_birth ? new Date(editablePatient.date_of_birth).toISOString().split('T')[0] : '') : (searchedPatient?.date_of_birth ? new Date(searchedPatient.date_of_birth).toISOString().split('T')[0] : '')} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, date_of_birth: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="date" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender</label>
                        <select value={editMode ? editablePatient?.gender || 'MALE' : searchedPatient?.gender || 'MALE'} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, gender: e.target.value as 'MALE' | 'FEMALE'} : null)} className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} disabled={!editMode}>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Blood Group</label>
                        <select value={editMode ? editablePatient?.blood_group || '' : searchedPatient?.blood_group || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, blood_group: e.target.value} : null)} className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} disabled={!editMode}>
                          <option value="">Select</option>
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">National ID</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.national_id || '' : searchedPatient?.national_id || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, national_id: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone Number</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.phone || '' : searchedPatient?.phone || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, phone: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email Address</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.email || '' : searchedPatient?.email || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, email: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="email" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Address</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.governorate || '' : searchedPatient?.governorate || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, governorate: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Insurance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Company</label>
                        {editMode ? (
                          <select 
                            value={editablePatient?.insurance_company || ''} 
                            onChange={(e) => setEditablePatient(prev => prev ? {...prev, insurance_company: e.target.value} : null)} 
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-blue-300 bg-white focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="">Select Insurance Company</option>
                            {insuranceCompanies.map((company, index) => {
                              const companyName = company.name || company.company_name || '';
                              const companyCode = company.code || company.company_code || '';
                              const uniqueKey = company.id || `${companyName}-${companyCode}` || `company-${index}`;
                              return (
                                <option key={uniqueKey} value={companyName}>
                                  {companyName} {companyCode ? `(${companyCode})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input 
                            readOnly 
                            value={searchedPatient?.insurance_company || ''} 
                            placeholder="—" 
                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-gray-200 bg-gray-50" 
                            type="text" 
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Number</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.insurance_number || '' : searchedPatient?.insurance_number || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, insurance_number: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Status</label>
                        <select value={editMode ? editablePatient?.insurance_state || 'Not Available' : searchedPatient?.insurance_state || 'Not Available'} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, insurance_state: e.target.value} : null)} className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} disabled={!editMode}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Pending">Pending</option>
                          <option value="Not Available">Not Available</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Emergency Contact Name</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.emergency_contact || '' : searchedPatient?.emergency_contact || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, emergency_contact: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Emergency Contact Phone</label>
                        <input readOnly={!editMode} value={editMode ? editablePatient?.emergency_contact_phone || '' : searchedPatient?.emergency_contact_phone || ''} onChange={(e) => editMode && setEditablePatient(prev => prev ? {...prev, emergency_contact_phone: e.target.value} : null)} placeholder="—" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none ${editMode ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} type="text" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Allergies</label>
                        {editMode ? (
                          <textarea 
                            value={editablePatient?.allergies || ''} 
                            onChange={(e) => setEditablePatient(prev => prev ? {...prev, allergies: e.target.value} : null)} 
                            placeholder="—" 
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-blue-300 bg-white focus:ring-2 focus:ring-blue-500`} 
                            rows={2}
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                            {searchedPatient?.allergies || '—'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Chronic Diseases</label>
                        {editMode ? (
                          <textarea 
                            value={editablePatient?.chronic_diseases || ''} 
                            onChange={(e) => setEditablePatient(prev => prev ? {...prev, chronic_diseases: e.target.value} : null)} 
                            placeholder="—" 
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-blue-300 bg-white focus:ring-2 focus:ring-blue-500`} 
                            rows={2}
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                            {searchedPatient?.chronic_diseases || '—'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Current Medications</label>
                        {editMode ? (
                          <textarea 
                            value={editablePatient?.current_medications || ''} 
                            onChange={(e) => setEditablePatient(prev => prev ? {...prev, current_medications: e.target.value} : null)} 
                            placeholder="—" 
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-blue-300 bg-white focus:ring-2 focus:ring-blue-500`} 
                            rows={2}
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[60px]">
                            {searchedPatient?.current_medications || '—'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Medical History</label>
                        {editMode ? (
                          <textarea 
                            value={typeof editablePatient?.medical_history === 'string' ? editablePatient.medical_history : ''} 
                            onChange={(e) => setEditablePatient(prev => prev ? {...prev, medical_history: e.target.value} : null)} 
                            placeholder="—" 
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none border-blue-300 bg-white focus:ring-2 focus:ring-blue-500`} 
                            rows={3}
                          />
                        ) : (
                          <div className="w-full px-3 py-2 border rounded-md text-sm border-gray-200 bg-gray-50 min-h-[80px]">
                            {typeof searchedPatient?.medical_history === 'string' ? searchedPatient.medical_history : (searchedPatient?.medical_history ? JSON.stringify(searchedPatient.medical_history) : '—')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {!searchedPatient && (
                    <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                          <Search size={32} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">No Patient Selected</p>
                          <p className="text-xs text-gray-500 mt-1">Enter a Patient ID, National ID, or Phone Number to search</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {editMode && (
                    <div className="mt-6 flex gap-3 justify-end">
                      <button 
                        onClick={handleCancelEdit}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
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
