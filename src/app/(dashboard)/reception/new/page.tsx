'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Phone, Mail, Calendar, MapPin, Shield, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PatientData {
  first_name_ar: string;
  last_name_ar: string;
  first_name_en: string;
  last_name_en: string;
  middle_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone: string;
  email: string;
  national_id: string;
  governorate: string;
  address: string;
  medical_history: string;
  insurance_company: string;
  insurance_number: string;
  emergency_contact: string;
  emergency_phone: string;
  allergies: string;
  chronic_diseases: string;
  current_medications: string;
}

const emptyPatient = (): PatientData => ({
  first_name_ar: '',
  last_name_ar: '',
  first_name_en: '',
  last_name_en: '',
  middle_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  phone: '',
  email: '',
  national_id: '',
  governorate: '',
  address: '',
  medical_history: '',
  insurance_company: '',
  insurance_number: '',
  emergency_contact: '',
  emergency_phone: '',
  allergies: '',
  chronic_diseases: '',
  current_medications: ''
});

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<PatientData>(emptyPatient());
  const [mounted, setMounted] = useState(false);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);

  useEffect(() => { 
    setMounted(true); 
    loadInsuranceCompanies();
  }, []);

  const loadInsuranceCompanies = async () => {
    try {
      const res = await fetch('/api/insurance-companies');
      if (res.ok) {
        const companies = await res.json();
        setInsuranceCompanies(Array.isArray(companies) ? companies : (companies.data || []));
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
    }
  };

  const handleSave = async () => {
    if (!current.phone || !current.date_of_birth || !current.gender || !current.first_name_ar || !current.last_name_ar) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate national ID - must be exactly 12 digits if provided
    if (current.national_id) {
      const nationalIdDigits = current.national_id.replace(/\D/g, ''); // Remove all non-digit characters
      if (nationalIdDigits.length !== 12) {
        toast.error('National ID must be exactly 12 digits');
        return;
      }
      if (nationalIdDigits !== current.national_id) {
        toast.error('National ID must contain only digits');
        return;
      }
    }

    // Validate insurance number format if provided
    if (current.insurance_number && current.insurance_company) {
      const insurancePattern = /^[A-Z0-9]{3,6}-\d{4,6}-\d{4}$/;
      if (!insurancePattern.test(current.insurance_number)) {
        toast.error('Insurance number must follow format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)');
        return;
      }
    }

    setLoading(true);
    console.log('Current state before save:', current);
    
    try {
      const patientData = {
        // Personal Information
        first_name_ar: current.first_name_ar || current.first_name_en || '',
        last_name_ar: current.last_name_ar || current.last_name_en || '',
        first_name_en: current.first_name_en || '',
        middle_name: current.middle_name || '',
        last_name_en: current.last_name_en || '',
        date_of_birth: current.date_of_birth,
        gender: current.gender,
        blood_group: current.blood_group,
        national_id: current.national_id,
        
        // Contact Information
        phone: current.phone,
        email: current.email,
        governorate: current.governorate || current.address,
        address: current.address,
        
        // Emergency Contact
        emergency_contact: current.emergency_contact,
        emergency_phone: current.emergency_phone,
        
        // Insurance Information
        insurance_company: current.insurance_company,
        insurance_number: current.insurance_number,
        
        // Medical Information
        allergies: current.allergies,
        chronic_diseases: current.chronic_diseases,
        current_medications: current.current_medications,
        medical_history: current.medical_history,
      };

      console.log('Sending patient data:', patientData);
      
      const res = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (res.ok) {
        toast.success('Patient and all information saved successfully');
        router.push('/reception/patients');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add patient to Tibbna Non-Medical DB');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/reception/patients">
            <button className="btn-secondary p-2">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Register New Patient</h2>
            <p className="page-description">Complete patient registration form for Tibbna Non-Medical DB</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title flex items-center gap-2">
              <User size={16} />
              Personal Information
            </h3>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name (Arabic) *
                </label>
                <input
                  type="text"
                  required
                  value={current.first_name_ar}
                  onChange={e => setCurrent({...current, first_name_ar: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., أحمد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name (Arabic) *
                </label>
                <input
                  type="text"
                  required
                  value={current.last_name_ar}
                  onChange={e => setCurrent({...current, last_name_ar: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., محمد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={current.middle_name}
                  onChange={e => setCurrent({...current, middle_name: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., عبد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name (English)
                </label>
                <input
                  type="text"
                  value={current.first_name_en}
                  onChange={e => setCurrent({...current, first_name_en: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Ahmed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name (English)
                </label>
                <input
                  type="text"
                  value={current.last_name_en}
                  onChange={e => setCurrent({...current, last_name_en: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Mohammed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={current.date_of_birth}
                  onChange={e => setCurrent({...current, date_of_birth: e.target.value})}
                  className="tibbna-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  required
                  value={current.gender}
                  onChange={e => setCurrent({...current, gender: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={current.blood_group}
                  onChange={e => setCurrent({...current, blood_group: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Blood Group</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID
                </label>
                <input
                  type="text"
                  value={current.national_id}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    if (value.length <= 12) {
                      setCurrent({...current, national_id: value});
                    }
                  }}
                  className={`tibbna-input ${
                    current.national_id && current.national_id.length !== 12 
                      ? 'border-red-500 focus:border-red-500' 
                      : ''
                  }`}
                  placeholder="e.g., 123456789012"
                  maxLength={12}
                />
                {current.national_id && current.national_id.length !== 12 && (
                  <p className="text-xs text-red-500 mt-1">
                    National ID must be exactly 12 digits ({current.national_id.length}/12)
                  </p>
                )}
                {current.national_id && current.national_id.length === 12 && (
                  <p className="text-xs text-green-500 mt-1">
                    ✓ Valid format
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title flex items-center gap-2">
              <Phone size={16} />
              Contact Information
            </h3>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={current.phone}
                  onChange={e => setCurrent({...current, phone: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., +964 770 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={current.email}
                  onChange={e => setCurrent({...current, email: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., patient@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Governorate
                </label>
                <input
                  type="text"
                  value={current.governorate}
                  onChange={e => setCurrent({...current, governorate: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Baghdad"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={current.address}
                  onChange={e => setCurrent({...current, address: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Street, District, City, Governorate"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title flex items-center gap-2">
              <Shield size={16} />
              Emergency Contact
            </h3>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={current.emergency_contact}
                  onChange={e => setCurrent({...current, emergency_contact: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Sarah Mohammed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={current.emergency_phone}
                  onChange={e => setCurrent({...current, emergency_phone: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., +964 770 987 6543"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title flex items-center gap-2">
              <Shield size={16} />
              Insurance Information
            </h3>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Company
                </label>
                <select
                  value={current.insurance_company}
                  onChange={e => setCurrent({...current, insurance_company: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Insurance Company</option>
                  {insuranceCompanies.map(company => (
                    <option key={company.id || company.name} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={current.insurance_number}
                    onChange={e => setCurrent({...current, insurance_number: e.target.value})}
                    className="tibbna-input flex-1"
                    placeholder="e.g., NAT001-12345-2024"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const selectedCompany = insuranceCompanies.find(c => c.name === current.insurance_company);
                      if (selectedCompany) {
                        const companyCode = selectedCompany.code || selectedCompany.id?.replace('INS-', '') || 'UNK';
                        const patientNumber = Math.floor(Math.random() * 90000) + 10000; // 5-digit random
                        const year = new Date().getFullYear();
                        const insuranceNumber = `${companyCode}-${patientNumber}-${year}`;
                        setCurrent({...current, insurance_number: insuranceNumber});
                      }
                    }}
                    className="btn-secondary px-3 py-2"
                    disabled={!current.insurance_company}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                {current.insurance_company && (
                  <p className="text-xs text-gray-500 mt-1">
                    Format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title flex items-center gap-2">
              <AlertCircle size={16} />
              Medical Information
            </h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergies
              </label>
              <textarea
                value={current.allergies}
                onChange={e => setCurrent({...current, allergies: e.target.value})}
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Penicillin, Peanuts, Shellfish"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chronic Diseases
              </label>
              <textarea
                value={current.chronic_diseases}
                onChange={e => setCurrent({...current, chronic_diseases: e.target.value})}
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Diabetes, Hypertension, Asthma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Medications
              </label>
              <textarea
                value={current.current_medications}
                onChange={e => setCurrent({...current, current_medications: e.target.value})}
                className="tibbna-input"
                rows={2}
                placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medical History
              </label>
              <textarea
                value={current.medical_history}
                onChange={e => setCurrent({...current, medical_history: e.target.value})}
                className="tibbna-input"
                rows={3}
                placeholder="e.g., Previous surgeries, hospitalizations, major illnesses"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Registering Patient...
              </>
            ) : (
              <>
                <Save size={16} />
                Register Patient
              </>
            )}
          </button>
          <Link href="/reception/patients">
            <button type="button" className="btn-secondary">Cancel</button>
          </Link>
        </div>
      </form>
    </>
  );
}
