'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Plus, Search, Edit, Trash2, Eye, X, Phone, MapPin } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { FinancePatient } from '@/types/finance';
import { toast } from 'sonner';
import StaffDropdown from '@/components/StaffDropdown';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

const emptyPatient = (): FinancePatient => ({
  patient_id: `fp-${Date.now()}`,
  patient_number: `P-2024-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
  first_name_ar: '', last_name_ar: '', full_name_ar: '',
  date_of_birth: '', gender: 'MALE', phone: '',
  total_balance: 0, is_active: true, created_at: new Date().toISOString(),
});

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<FinancePatient | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<FinancePatient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const response = await res.json();
        const rawPatients = Array.isArray(response) ? response : (response.data || []);
        
        console.log('🔍 Search term:', searchTerm);
        console.log('📦 API Response:', response);
        console.log('👥 Raw patients count:', rawPatients.length);
        console.log('👤 First patient:', rawPatients[0]);
        
        if (rawPatients.length === 0) {
          toast.error('No patient found with this search term');
          setSearchedPatient(null);
        } else {
          const p = rawPatients[0];
          const mappedPatient: FinancePatient = {
            patient_id: p.id || p.patientid || p.patient_id,
            patient_number: p.patientNumber || p.patient_number || p.id,
            first_name_ar: p.firstNameAr || p.first_name_ar || p.firstname || '',
            last_name_ar: p.lastNameAr || p.last_name_ar || p.lastname || '',
            middle_name: p.middleName || p.middle_name || p.middlename || '',
            full_name_ar: p.fullNameAr || p.full_name_ar || `${p.firstname || ''} ${p.middlename || ''} ${p.lastname || ''}`.trim(),
            first_name_en: p.firstNameEn || p.first_name_en || p.firstname || '',
            last_name_en: p.lastNameEn || p.last_name_en || p.lastname || '',
            full_name_en: p.fullNameEn || p.full_name_en || `${p.firstname || ''} ${p.middlename || ''} ${p.lastname || ''}`.trim(),
            date_of_birth: p.dateOfBirth || p.date_of_birth || p.dateofbirth || '',
            age: p.age || 0,
            gender: p.gender || 'MALE',
            blood_group: p.bloodGroup || p.blood_group || p.bloodgroup || '',
            phone: p.phone || '',
            mobile: p.mobile || p.phone || '',
            email: p.email || '',
            national_id: p.nationalId || p.national_id || p.nationalid || '',
            address: p.address || '',
            governorate: p.governorate || '',
            insurance_state: p.insuranceState || p.insurance_state || '',
            insurance_number: p.insuranceNumber || p.insurance_number || '',
            insurance_company: p.insuranceCompany || p.insurance_company || '',
            next_appointment: p.nextAppointment || p.next_appointment || '',
            total_balance: 0,
            is_active: true,
            created_at: p.createdAt || p.created_at || p.createdat || new Date().toISOString(),
            id: p.id || p.patientid,
          };
          setSearchedPatient(mappedPatient);
          
          if (rawPatients.length === 1) {
            toast.success(`Patient found: ${mappedPatient.full_name_ar || mappedPatient.full_name_en}`);
          } else {
            toast.success(`Found ${rawPatients.length} patients. Showing: ${mappedPatient.full_name_ar || mappedPatient.full_name_en}`, {
              description: 'Use more specific search terms (Patient ID, National ID, or exact Phone Number) for better results'
            });
          }
        }
      } else {
        toast.error('Failed to search patient');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search patient');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchedPatient(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Debounced search for autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        fetchSuggestions(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchSuggestions = async (term: string) => {
    try {
      const res = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(term)}&limit=5`);
      if (res.ok) {
        const response = await res.json();
        const rawPatients = Array.isArray(response) ? response : (response.data || []);
        
        const mappedSuggestions = rawPatients.slice(0, 5).map((p: any) => ({
          patient_id: p.id || p.patientid || p.patient_id,
          patient_number: p.patientNumber || p.patient_number || p.id,
          first_name_ar: p.firstNameAr || p.first_name_ar || p.firstname || '',
          last_name_ar: p.lastNameAr || p.last_name_ar || p.lastname || '',
          middle_name: p.middleName || p.middle_name || p.middlename || '',
          full_name_ar: p.fullNameAr || p.full_name_ar || `${p.firstname || ''} ${p.middlename || ''} ${p.lastname || ''}`.trim(),
          first_name_en: p.firstNameEn || p.first_name_en || p.firstname || '',
          last_name_en: p.lastNameEn || p.last_name_en || p.lastname || '',
          full_name_en: p.fullNameEn || p.full_name_en || `${p.firstname || ''} ${p.middlename || ''} ${p.lastname || ''}`.trim(),
          date_of_birth: p.dateOfBirth || p.date_of_birth || p.dateofbirth || '',
          age: p.age || 0,
          gender: p.gender || 'MALE',
          blood_group: p.bloodGroup || p.blood_group || p.bloodgroup || '',
          phone: p.phone || '',
          mobile: p.mobile || p.phone || '',
          email: p.email || '',
          national_id: p.nationalId || p.national_id || p.nationalid || '',
          address: p.address || '',
          governorate: p.governorate || '',
          insurance_state: p.insuranceState || p.insurance_state || '',
          insurance_number: p.insuranceNumber || p.insurance_number || '',
          insurance_company: p.insuranceCompany || p.insurance_company || '',
          next_appointment: p.nextAppointment || p.next_appointment || '',
          total_balance: 0,
          is_active: true,
          created_at: p.createdAt || p.created_at || p.createdat || new Date().toISOString(),
          id: p.id || p.patientid,
        }));
        
        setSuggestions(mappedSuggestions);
        setShowSuggestions(mappedSuggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Suggestions fetch error:', error);
    }
  };

  const handleSuggestionClick = (patient: FinancePatient) => {
    setSearchTerm(patient.patient_number || patient.national_id || patient.phone || '');
    setSearchedPatient(patient);
    setShowSuggestions(false);
    setSuggestions([]);
    toast.success(`Patient selected: ${patient.full_name_ar || patient.full_name_en}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Search</h1>
          <p className="text-gray-500 text-sm">Search by Patient ID, National ID, or Phone Number</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              🏥 Tibbna Non-Medical DB
            </span>
            <span className="text-xs text-gray-400">Connected to Non-Medical database</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <input
            placeholder="Search patients..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {suggestions.map((patient, index) => (
                <div
                  key={patient.patient_id}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                    index === selectedSuggestionIndex 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSuggestionClick(patient)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {patient.full_name_ar || patient.full_name_en}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        ID: {patient.patient_number || patient.patient_id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">
                        {patient.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={10} />
                            {patient.phone}
                          </div>
                        )}
                      </div>
                      {patient.national_id && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          NID: {patient.national_id}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {suggestions.length >= 5 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                  Showing first 5 of many results
                </div>
              )}
            </div>
          )}
        </div>
        
        <StaffDropdown
          value={selectedStaff?.id || ''}
          onChange={(staffId, staff) => setSelectedStaff(staff)}
          placeholder="Select medical staff (optional)"
        />
      </div>

      <div className="flex gap-2 max-w-2xl">
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Searching...
            </>
          ) : (
            <>
              <Search size={16} />
              Search
            </>
          )}
        </button>
        {searchedPatient && (
          <button 
            onClick={handleClearSearch}
            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Patient Information Display Frame */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Patient Information</h2>
          <p className="text-xs text-gray-600 mt-1">View detailed patient records</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Patient ID</label>
                <input 
                  type="text"
                  value={searchedPatient?.patient_number || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">First Name</label>
                <input 
                  type="text"
                  value={searchedPatient?.first_name_ar || searchedPatient?.first_name_en || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Middle Name</label>
                <input 
                  type="text"
                  value={searchedPatient?.middle_name || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Last Name</label>
                <input 
                  type="text"
                  value={searchedPatient?.last_name_ar || searchedPatient?.last_name_en || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Demographics Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Age</label>
                <input 
                  type="text"
                  value={searchedPatient?.age ? `${searchedPatient.age} years` : ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender</label>
                <input 
                  type="text"
                  value={searchedPatient?.gender || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Blood Group</label>
                <input 
                  type="text"
                  value={searchedPatient?.blood_group || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">National ID</label>
                <input 
                  type="text"
                  value={searchedPatient?.national_id || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone Number</label>
                <input 
                  type="text"
                  value={searchedPatient?.phone || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email Address</label>
                <input 
                  type="text"
                  value={searchedPatient?.email || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Address</label>
                <input 
                  type="text"
                  value={searchedPatient?.address || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Insurance Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Insurance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Company</label>
                <input 
                  type="text"
                  value={searchedPatient?.insurance_company || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Number</label>
                <input 
                  type="text"
                  value={searchedPatient?.insurance_number || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Insurance Status</label>
                <input 
                  type="text"
                  value={searchedPatient?.insurance_state || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Appointment Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Appointments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Next Appointment</label>
                <input 
                  type="text"
                  value={searchedPatient?.next_appointment || ''}
                  readOnly
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {!searchedPatient && (
            <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">No Patient Selected</p>
                  <p className="text-xs text-gray-500 mt-1">Enter a Patient ID, National ID, or Phone Number to search</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
