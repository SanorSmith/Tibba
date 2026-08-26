"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { ArrowLeft, User, Phone, Shield, AlertCircle, RefreshCw } from "lucide-react";

interface InlinePatientRegistrationProps {
  workspaceid: string;
  onCancel: () => void;
  onSuccess: (patient: any) => void;
}

export default function InlinePatientRegistration({
  workspaceid,
  onCancel,
  onSuccess,
}: InlinePatientRegistrationProps) {
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [newPatientForm, setNewPatientForm] = useState({
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
    current_medications: '',
  });

  useEffect(() => {
    loadInsuranceCompanies();
  }, []);

  const loadInsuranceCompanies = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/insurance-companies`);
      if (res.ok) {
        const data = await res.json();
        setInsuranceCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
    }
  };

  const handleSave = async () => {
    if (!newPatientForm.phone || !newPatientForm.date_of_birth || !newPatientForm.gender || !newPatientForm.first_name_ar || !newPatientForm.last_name_ar) {
      setToast({ message: 'Please fill all required fields', type: 'error' });
      return;
    }

    // Validate national ID - must be exactly 12 digits if provided
    if (newPatientForm.national_id) {
      const nationalIdDigits = newPatientForm.national_id.replace(/\D/g, '');
      if (nationalIdDigits.length !== 12) {
        setToast({ message: 'National ID must be exactly 12 digits', type: 'error' });
        return;
      }
      if (nationalIdDigits !== newPatientForm.national_id) {
        setToast({ message: 'National ID must contain only digits', type: 'error' });
        return;
      }
    }

    // Validate insurance number format if provided
    if (newPatientForm.insurance_number && newPatientForm.insurance_company) {
      const insurancePattern = /^[A-Z0-9]{3,6}-\d{4,6}-\d{4}$/;
      if (!insurancePattern.test(newPatientForm.insurance_number)) {
        setToast({ message: 'Insurance number must follow format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)', type: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const patientData = {
        first_name_ar: newPatientForm.first_name_ar || newPatientForm.first_name_en || '',
        last_name_ar: newPatientForm.last_name_ar || newPatientForm.last_name_en || '',
        first_name_en: newPatientForm.first_name_en || '',
        middle_name: newPatientForm.middle_name || '',
        last_name_en: newPatientForm.last_name_en || '',
        date_of_birth: newPatientForm.date_of_birth,
        gender: newPatientForm.gender,
        blood_group: newPatientForm.blood_group,
        national_id: newPatientForm.national_id,
        phone: newPatientForm.phone,
        email: newPatientForm.email,
        governorate: newPatientForm.governorate || newPatientForm.address,
        address: newPatientForm.address,
        emergency_contact: newPatientForm.emergency_contact,
        emergency_phone: newPatientForm.emergency_phone,
        insurance_company: newPatientForm.insurance_company,
        insurance_number: newPatientForm.insurance_number,
        allergies: newPatientForm.allergies,
        chronic_diseases: newPatientForm.chronic_diseases,
        current_medications: newPatientForm.current_medications,
        medical_history: newPatientForm.medical_history,
      };

      const res = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientData, workspaceid }),
      });

      if (res.ok) {
        const result = await res.json();
        setToast({ message: 'Patient registered successfully!', type: 'success' });
        setTimeout(() => onSuccess(result.patient), 1500);
      } else {
        const error = await res.json();
        setToast({ message: error.error || 'Failed to create patient', type: 'error' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setToast({ message: 'Failed to save patient', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-2 sticky top-0 bg-white z-10 py-2 border-b">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h3 className="text-base font-semibold text-gray-800">Register New Patient</h3>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <User size={14} />
            Personal Information
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">First Name (Arabic) *</Label>
              <Input
                value={newPatientForm.first_name_ar}
                onChange={(e) => setNewPatientForm({...newPatientForm, first_name_ar: e.target.value})}
                placeholder="e.g., أحمد"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name (Arabic) *</Label>
              <Input
                value={newPatientForm.last_name_ar}
                onChange={(e) => setNewPatientForm({...newPatientForm, last_name_ar: e.target.value})}
                placeholder="e.g., محمد"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Middle Name</Label>
              <Input
                value={newPatientForm.middle_name}
                onChange={(e) => setNewPatientForm({...newPatientForm, middle_name: e.target.value})}
                placeholder="e.g., عبد"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">First Name (English)</Label>
              <Input
                value={newPatientForm.first_name_en}
                onChange={(e) => setNewPatientForm({...newPatientForm, first_name_en: e.target.value})}
                placeholder="e.g., Ahmed"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name (English)</Label>
              <Input
                value={newPatientForm.last_name_en}
                onChange={(e) => setNewPatientForm({...newPatientForm, last_name_en: e.target.value})}
                placeholder="e.g., Mohammed"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Date of Birth *</Label>
              <Input
                type="date"
                value={newPatientForm.date_of_birth}
                onChange={(e) => setNewPatientForm({...newPatientForm, date_of_birth: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <Select
                value={newPatientForm.gender}
                onValueChange={(value) => setNewPatientForm({...newPatientForm, gender: value})}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Blood Group</Label>
              <Select
                value={newPatientForm.blood_group}
                onValueChange={(value) => setNewPatientForm({...newPatientForm, blood_group: value})}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">National ID</Label>
              <Input
                value={newPatientForm.national_id}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 12) {
                    setNewPatientForm({...newPatientForm, national_id: value});
                  }
                }}
                placeholder="e.g., 123456789012"
                maxLength={12}
                className={`h-8 text-xs font-mono ${
                  newPatientForm.national_id && newPatientForm.national_id.length !== 12 
                    ? 'border-red-500 focus:border-red-500' 
                    : ''
                }`}
              />
              {newPatientForm.national_id && newPatientForm.national_id.length !== 12 && (
                <p className="text-xs text-red-500 mt-1">
                  National ID must be exactly 12 digits ({newPatientForm.national_id.length}/12)
                </p>
              )}
              {newPatientForm.national_id && newPatientForm.national_id.length === 12 && (
                <p className="text-xs text-green-500 mt-1">
                  ✓ Valid format
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Phone size={14} />
            Contact Information
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Phone Number *</Label>
              <Input
                type="tel"
                value={newPatientForm.phone}
                onChange={(e) => setNewPatientForm({...newPatientForm, phone: e.target.value})}
                placeholder="e.g., +964 770 123 4567"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                value={newPatientForm.email}
                onChange={(e) => setNewPatientForm({...newPatientForm, email: e.target.value})}
                placeholder="e.g., patient@email.com"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Governorate</Label>
              <Input
                value={newPatientForm.governorate}
                onChange={(e) => setNewPatientForm({...newPatientForm, governorate: e.target.value})}
                placeholder="e.g., Baghdad"
                className="h-8 text-xs"
              />
            </div>
            <div className="lg:col-span-3">
              <Label className="text-xs">Address</Label>
              <Input
                value={newPatientForm.address}
                onChange={(e) => setNewPatientForm({...newPatientForm, address: e.target.value})}
                placeholder="e.g., Street, District, City, Governorate"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={14} />
            Emergency Contact
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Emergency Contact Name</Label>
              <Input
                value={newPatientForm.emergency_contact}
                onChange={(e) => setNewPatientForm({...newPatientForm, emergency_contact: e.target.value})}
                placeholder="e.g., Sarah Mohammed"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Emergency Contact Phone</Label>
              <Input
                type="tel"
                value={newPatientForm.emergency_phone}
                onChange={(e) => setNewPatientForm({...newPatientForm, emergency_phone: e.target.value})}
                placeholder="e.g., +964 770 987 6543"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Information */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={14} />
            Insurance Information
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Insurance Company</Label>
              <Select
                value={newPatientForm.insurance_company}
                onValueChange={(value) => setNewPatientForm({...newPatientForm, insurance_company: value})}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Insurance Company" />
                </SelectTrigger>
                <SelectContent>
                  {insuranceCompanies.map(company => (
                    <SelectItem key={company.id || company.name} value={company.name}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Insurance Number</Label>
              <div className="flex gap-2">
                <Input
                  value={newPatientForm.insurance_number}
                  onChange={(e) => setNewPatientForm({...newPatientForm, insurance_number: e.target.value})}
                  placeholder="e.g., NAT001-12345-2024"
                  className="h-8 text-xs font-mono flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const selectedCompany = insuranceCompanies.find(c => c.name === newPatientForm.insurance_company);
                    if (selectedCompany) {
                      const companyCode = selectedCompany.code || selectedCompany.id?.replace('INS-', '') || 'UNK';
                      const patientNumber = Math.floor(Math.random() * 90000) + 10000;
                      const year = new Date().getFullYear();
                      const insuranceNumber = `${companyCode}-${patientNumber}-${year}`;
                      setNewPatientForm({...newPatientForm, insurance_number: insuranceNumber});
                    }
                  }}
                  className="bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed h-8"
                  disabled={!newPatientForm.insurance_company}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              {newPatientForm.insurance_company && (
                <p className="text-xs text-gray-500 mt-1">
                  Format: CompanyCode-PatientID-Year (e.g., NAT001-12345-2024)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <AlertCircle size={14} />
            Medical Information
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Allergies</Label>
            <Textarea
              value={newPatientForm.allergies}
              onChange={(e) => setNewPatientForm({...newPatientForm, allergies: e.target.value})}
              placeholder="e.g., Penicillin, Peanuts"
              className="text-xs"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Chronic Diseases</Label>
            <Textarea
              value={newPatientForm.chronic_diseases}
              onChange={(e) => setNewPatientForm({...newPatientForm, chronic_diseases: e.target.value})}
              placeholder="e.g., Diabetes, Hypertension"
              className="text-xs"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Current Medications</Label>
            <Textarea
              value={newPatientForm.current_medications}
              onChange={(e) => setNewPatientForm({...newPatientForm, current_medications: e.target.value})}
              placeholder="e.g., Metformin 500mg twice daily"
              className="text-xs"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Medical History</Label>
            <Textarea
              value={newPatientForm.medical_history}
              onChange={(e) => setNewPatientForm({...newPatientForm, medical_history: e.target.value})}
              placeholder="e.g., Previous surgeries, major illnesses"
              className="text-xs"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Saving...' : 'Save Patient'}
        </Button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
