'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Briefcase, Building2, CreditCard, FileText } from 'lucide-react';
import type { EmployeeFormData, Employee } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import departmentsData from '@/data/hr/departments.json';
import payrollData from '@/data/hr/payroll.json';
import attendanceData from '@/data/hr/attendance.json';
import { countriesWithCommonFirst } from '@/data/countries';

const initialForm: EmployeeFormData = {
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'MALE',
  marital_status: 'SINGLE',
  nationality: 'Iraqi',
  national_id: '',
  email: '',
  phone: '',
  address: '',
  employment_type: 'FULL_TIME',
  employee_category: 'ADMINISTRATIVE',
  job_title: '',
  job_category_id: '',
  department_id: '',
  grade_id: '',
  date_of_hire: new Date().toISOString().split('T')[0],
  shift_id: '',
  bank_account_number: '',
  bank_name: '',
  basic_salary: undefined,
  payment_frequency: 'MONTHLY',
  housing_allowance: undefined,
  transport_allowance: undefined,
  meal_allowance: undefined,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  cv_summary: '',
  education: [],
  work_history: [],
  certifications: [],
  languages: [],
  skills: [],
  pension_eligible: true,
  pension_scheme: 'STANDARD',
  pension_contribution_rate: 5.0,
  employer_pension_rate: 5.0,
  pension_start_date: new Date().toISOString().split('T')[0],
  social_security_number: '',
  social_security_rate: 5.0,
  tax_id_number: '',
  tax_exemption_amount: 0,
  settlement_eligible: true,
  settlement_calculation_method: 'IRAQI_LABOR_LAW',
  gratuity_eligible: true,
  notice_period_days: 30,
  specialty: '',
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployeeFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);

  const update = (field: keyof EmployeeFormData, value: string | number | boolean | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.date_of_birth) e.date_of_birth = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.job_title.trim()) e.job_title = 'Job title is required';
    if (!form.department_id) e.department_id = 'Department is required';
    if (!form.date_of_hire) e.date_of_hire = 'Hire date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    // Profile step is optional, always valid
    return true;
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      if (response.ok) {
        setDepartments(data.data || []);
      } else {
        console.error('Failed to load departments:', data.error);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const response = await fetch('/api/specialties');
      const data = await response.json();
      
      if (response.ok) {
        setSpecialties(data.data || []);
      } else {
        console.error('Failed to load specialties:', data.error);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadSpecialties();
  }, []);

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const dept = departments.find(d => d.id === form.department_id);

    // Debug: Log what we're sending
    console.log('🔍 Form Data Being Submitted:', {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      date_of_hire: form.date_of_hire,
      basic_salary: form.basic_salary,
      payment_frequency: form.payment_frequency,
      housing_allowance: form.housing_allowance,
      transport_allowance: form.transport_allowance,
      meal_allowance: form.meal_allowance,
      department_id: form.department_id,
      job_title: form.job_title,
      national_id: form.national_id
    });

    const newEmployee = {
      // Employee details - use snake_case to match API
      first_name: form.first_name,
      middle_name: form.middle_name || '',
      last_name: form.last_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      marital_status: form.marital_status || null,
      nationality: form.nationality || 'Iraqi',
      national_id: form.national_id,
      email: form.email,
      phone: form.phone,
      address: form.address || null,
      // Employment Details
      job_title: form.job_title || null,
      department_id: form.department_id || null,
      employee_category: form.employee_category || null,
      employment_type: form.employment_type || null,
      date_of_hire: form.date_of_hire || null,
      // Compensation details
      basic_salary: form.basic_salary || null,
      payment_frequency: form.payment_frequency || 'MONTHLY',
      housing_allowance: form.housing_allowance || 0,
      transport_allowance: form.transport_allowance || 0,
      meal_allowance: form.meal_allowance || 0,
      currency: 'USD'
    };

    try {
      // First create the employee
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployee),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const employeeId = result.data.employee_id;
        
        // Then create compensation record if basic salary is provided
        if (form.basic_salary) {
          const compensationData = {
            employee_id: employeeId,
            basic_salary: form.basic_salary,
            payment_frequency: form.payment_frequency || 'MONTHLY',
            housing_allowance: form.housing_allowance || 0,
            transport_allowance: form.transport_allowance || 0,
            meal_allowance: form.meal_allowance || 0,
            currency: 'USD',
            effective_from: form.date_of_hire || new Date().toISOString().split('T')[0]
          };

          const compensationResponse = await fetch('/api/hr/compensation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(compensationData),
          });

          const compensationResult = await compensationResponse.json();
          
          if (!compensationResponse.ok || !compensationResult.success) {
            console.error('Compensation creation warning:', compensationResult.error);
            toast.warning('Employee created but compensation failed to save');
          }
        }

        setGeneratedId(result.data.custom_staff_id);
        setSubmitted(true);
        toast.success(`${form.first_name} ${form.last_name} added successfully with ${form.payment_frequency} payment frequency`);
      } else {
        console.error('API Error:', result);
        toast.error(result.error || 'Failed to save employee');
      }
    } catch (error) {
      console.error('Create employee error:', error);
      toast.error('Error creating employee');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <Save size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Employee Created Successfully</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          Employee Number: <strong>{generatedId}</strong>
        </p>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          {form.first_name} {form.last_name} has been added to the system.
        </p>
        <div className="flex gap-3 mt-4">
          <Link href="/hr/employees">
            <button className="btn-secondary">Back to Directory</button>
          </Link>
          <button className="btn-primary" onClick={() => { setSubmitted(false); setForm(initialForm); setStep(1); }}>
            Add Another
          </button>
        </div>
      </div>
    );
  }

  const dept = departments.find(d => d.id === form.department_id);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/employees">
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <h2 className="page-title">Add New Employee</h2>
            <p className="page-description">Step {step} of 4</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center justify-between">
            {[
              { n: 1, label: 'Personal Info', icon: User },
              { n: 2, label: 'Employment', icon: Briefcase },
              { n: 3, label: 'Profile', icon: FileText },
              { n: 4, label: 'Review & Submit', icon: Save },
            ].map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.n;
              const isDone = step > s.n;
              return (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: isDone ? '#D1FAE5' : isActive ? '#DBEAFE' : '#F3F4F6',
                        color: isDone ? '#065F46' : isActive ? '#1D4ED8' : '#9CA3AF',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 400, color: isActive ? '#111827' : '#9CA3AF' }}>
                      {s.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className="h-0.5 flex-1 mx-2" style={{ backgroundColor: isDone ? '#6EE7B7' : '#E5E7EB', marginBottom: '20px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 1: Personal Information */}
      {step === 1 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Personal Information</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Full Name">
              <FormRow columns={3}>
                <FormGroup label="First Name" required error={errors.first_name}>
                  <input className="tibbna-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="e.g. Ahmed" />
                </FormGroup>
                <FormGroup label="Middle Name">
                  <input className="tibbna-input" value={form.middle_name} onChange={e => update('middle_name', e.target.value)} placeholder="e.g. Hassan" />
                </FormGroup>
                <FormGroup label="Last Name" required error={errors.last_name}>
                  <input className="tibbna-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="e.g. Al-Bayati" />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Personal Details">
              <FormRow columns={3}>
                <FormGroup label="Date of Birth" required error={errors.date_of_birth}>
                  <input className="tibbna-input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
                </FormGroup>
                <FormGroup label="Gender" required>
                  <select className="tibbna-input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </FormGroup>
                <FormGroup label="Marital Status">
                  <select className="tibbna-input" value={form.marital_status} onChange={e => update('marital_status', e.target.value)}>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={2}>
                <FormGroup label="Nationality">
                  <select className="tibbna-input" value={form.nationality} onChange={e => update('nationality', e.target.value)}>
                    {countriesWithCommonFirst.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </FormGroup>
                <FormGroup label="National ID" error={errors.national_id}>
                  <input 
                    className="tibbna-input" 
                    type="text"
                    pattern="\d{12}"
                    maxLength={12}
                    inputMode="numeric"
                    placeholder="e.g. 123456789012"
                    value={form.national_id} 
                    onChange={e => update('national_id', e.target.value.replace(/\D/g, ''))} 
                  />
                  <span style={{ fontSize: '11px', color: 'rgb(163, 163, 163)' }}>
                    Optional: Must be exactly 12 digits
                  </span>
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Contact Information">
              <FormRow columns={2}>
                <FormGroup label="Work Email" required error={errors.email}>
                  <input className="tibbna-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="ahmed.albayati@tibbna.iq" />
                </FormGroup>
                <FormGroup label="Mobile Phone" required error={errors.phone}>
                  <input className="tibbna-input" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+964 770 123 4567" />
                </FormGroup>
              </FormRow>
              <FormRow columns={1}>
                <FormGroup label="Address">
                  <input className="tibbna-input" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street, City, Governorate" />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Emergency Contact">
              <FormRow columns={3}>
                <FormGroup label="Contact Name">
                  <input className="tibbna-input" value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} />
                </FormGroup>
                <FormGroup label="Relationship">
                  <input className="tibbna-input" value={form.emergency_contact_relationship} onChange={e => update('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, Parent" />
                </FormGroup>
                <FormGroup label="Phone">
                  <input className="tibbna-input" value={form.emergency_contact_phone} onChange={e => update('emergency_contact_phone', e.target.value)} placeholder="+964 770 000 0000" />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormActions>
              <Link href="/hr/employees"><button className="btn-secondary">Cancel</button></Link>
              <button className="btn-primary" onClick={handleNext}>Next: Employment Details</button>
            </FormActions>
          </div>
        </div>
      )}

      {/* Step 2: Employment Details */}
      {step === 2 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Employment Details</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Position">
              <FormRow columns={2}>
                <FormGroup label="Job Title" required error={errors.job_title}>
                  <input className="tibbna-input" value={form.job_title} onChange={e => update('job_title', e.target.value)} placeholder="e.g. Senior Physician" />
                </FormGroup>
                <FormGroup label="Department" required error={errors.department_id}>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.department_id} onChange={e => update('department_id', e.target.value)}>
                    <option value="">Select a department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={1}>
                <FormGroup label="Specialty">
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.specialty} 
                    onChange={e => update('specialty', e.target.value)}
                    disabled={!form.department_id || loadingSpecialties}
                  >
                    <option value="">
                      {form.department_id ? 'Select a specialty' : 'Select a department first'}
                    </option>
                    {specialties
                      .filter(s => !form.department_id || s.department_id === form.department_id)
                      .map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={3}>
                <FormGroup label="Employee Category" required>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.employee_category} onChange={e => update('employee_category', e.target.value)}>
                    <option value="Staff">Staff</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Technician">Technician</option>
                    <option value="Support">Support</option>
                  </select>
                </FormGroup>
                <FormGroup label="Employment Type">
                  <select className="tibbna-input" value={form.employment_type} onChange={e => update('employment_type', e.target.value)}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="TEMPORARY">Temporary</option>
                  </select>
                </FormGroup>
                <FormGroup label="Date of Hire" required error={errors.date_of_hire}>
                  <input className="tibbna-input" type="date" value={form.date_of_hire} onChange={e => update('date_of_hire', e.target.value)} />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Compensation">
              <FormRow columns={3}>
                <FormGroup label="Salary Grade">
                  <select className="tibbna-input" value={form.grade_id} onChange={e => update('grade_id', e.target.value)}>
                    <option value="">Select Grade</option>
                    {payrollData.salary_grades.map(g => (
                      <option key={g.id} value={g.id}>{g.code} - {g.name} ({(g.min_salary / 1000000).toFixed(1)}-{(g.max_salary / 1000000).toFixed(1)}M)</option>
                    ))}
                  </select>
                </FormGroup>
                <FormGroup label="Basic Salary (IQD)" helper="Monthly basic salary">
                  <input className="tibbna-input" type="number" value={form.basic_salary || ''} onChange={e => update('basic_salary', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 2000000" />
                </FormGroup>
                <FormGroup label="Payment Frequency" helper="How often employee gets paid">
                  <select className="tibbna-input" value={form.payment_frequency} onChange={e => update('payment_frequency', e.target.value)}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BI-WEEKLY">Every Two Weeks</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={3}>
                <FormGroup label="Housing Allowance (USD)" helper="Monthly housing allowance">
                  <input className="tibbna-input" type="number" value={form.housing_allowance || ''} onChange={e => update('housing_allowance', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 500000" />
                </FormGroup>
                <FormGroup label="Transport Allowance (USD)" helper="Monthly transport allowance">
                  <input className="tibbna-input" type="number" value={form.transport_allowance || ''} onChange={e => update('transport_allowance', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 100000" />
                </FormGroup>
                <FormGroup label="Meal Allowance (USD)" helper="Monthly meal allowance">
                  <input className="tibbna-input" type="number" value={form.meal_allowance || ''} onChange={e => update('meal_allowance', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 75000" />
                </FormGroup>
              </FormRow>
              <FormRow columns={1}>
                <FormGroup label="Shift Pattern">
                  <select className="tibbna-input" value={form.shift_id} onChange={e => update('shift_id', e.target.value)}>
                    <option value="">Select Shift</option>
                    {attendanceData.shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Settlement Rules & Deductions">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                Configure pension, social security, tax, and end-of-service settlement rules
              </div>
              
              {/* Pension Configuration */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Pension Scheme</h4>
                <FormRow columns={3}>
                  <FormGroup label="Pension Eligible">
                    <select className="tibbna-input" value={form.pension_eligible ? 'true' : 'false'} onChange={e => update('pension_eligible', e.target.value === 'true')}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Pension Scheme">
                    <select className="tibbna-input" value={form.pension_scheme} onChange={e => update('pension_scheme', e.target.value)}>
                      <option value="STANDARD">Standard</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="PRIVATE">Private</option>
                      <option value="NONE">None</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Pension Start Date">
                    <input className="tibbna-input" type="date" value={form.pension_start_date} onChange={e => update('pension_start_date', e.target.value)} />
                  </FormGroup>
                </FormRow>
                <FormRow columns={2}>
                  <FormGroup label="Employee Contribution (%)" helper="Employee pension contribution rate">
                    <input className="tibbna-input" type="number" step="0.01" min="0" max="100" value={form.pension_contribution_rate || ''} onChange={e => update('pension_contribution_rate', e.target.value ? Number(e.target.value) : undefined)} placeholder="5.00" />
                  </FormGroup>
                  <FormGroup label="Employer Contribution (%)" helper="Employer pension contribution rate">
                    <input className="tibbna-input" type="number" step="0.01" min="0" max="100" value={form.employer_pension_rate || ''} onChange={e => update('employer_pension_rate', e.target.value ? Number(e.target.value) : undefined)} placeholder="5.00" />
                  </FormGroup>
                </FormRow>
              </div>

              {/* Deductions Configuration */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Deductions</h4>
                <FormRow columns={2}>
                  <FormGroup label="Social Security Number">
                    <input className="tibbna-input" value={form.social_security_number} onChange={e => update('social_security_number', e.target.value)} placeholder="e.g. SS-123456789" />
                  </FormGroup>
                  <FormGroup label="Social Security Rate (%)" helper="Default 5% as per Iraqi law">
                    <input className="tibbna-input" type="number" step="0.01" min="0" max="100" value={form.social_security_rate || ''} onChange={e => update('social_security_rate', e.target.value ? Number(e.target.value) : undefined)} placeholder="5.00" />
                  </FormGroup>
                </FormRow>
                <FormRow columns={2}>
                  <FormGroup label="Tax ID Number">
                    <input className="tibbna-input" value={form.tax_id_number} onChange={e => update('tax_id_number', e.target.value)} placeholder="e.g. TAX-123456789" />
                  </FormGroup>
                  <FormGroup label="Tax Exemption Amount (IQD)" helper="Monthly tax exemption amount">
                    <input className="tibbna-input" type="number" value={form.tax_exemption_amount || ''} onChange={e => update('tax_exemption_amount', e.target.value ? Number(e.target.value) : undefined)} placeholder="0" />
                  </FormGroup>
                </FormRow>
              </div>

              {/* End-of-Service Settlement */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>End-of-Service Settlement</h4>
                <FormRow columns={3}>
                  <FormGroup label="Settlement Eligible">
                    <select className="tibbna-input" value={form.settlement_eligible ? 'true' : 'false'} onChange={e => update('settlement_eligible', e.target.value === 'true')}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Calculation Method">
                    <select className="tibbna-input" value={form.settlement_calculation_method} onChange={e => update('settlement_calculation_method', e.target.value)}>
                      <option value="IRAQI_LABOR_LAW">Iraqi Labor Law</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Notice Period (Days)">
                    <input className="tibbna-input" type="number" min="0" value={form.notice_period_days || ''} onChange={e => update('notice_period_days', e.target.value ? Number(e.target.value) : undefined)} placeholder="30" />
                  </FormGroup>
                </FormRow>
                <FormRow columns={1}>
                  <FormGroup label="Gratuity Eligible" helper="End-of-service gratuity/bonus eligibility">
                    <select className="tibbna-input" value={form.gratuity_eligible ? 'true' : 'false'} onChange={e => update('gratuity_eligible', e.target.value === 'true')}>
                      <option value="true">Yes - Eligible for gratuity</option>
                      <option value="false">No - Not eligible</option>
                    </select>
                  </FormGroup>
                </FormRow>
              </div>
            </FormSection>

            <FormSection title="Bank Details">
              <FormRow columns={2}>
                <FormGroup label="Bank Name">
                  <input className="tibbna-input" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} placeholder="e.g. Rasheed Bank" />
                </FormGroup>
                <FormGroup label="Account Number">
                  <input className="tibbna-input" value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} placeholder="e.g. 1234567890" />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormActions>
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next: Profile</button>
            </FormActions>
          </div>
        </div>
      )}

      {/* Step 3: Profile Management */}
      {step === 3 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee Profile</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>CV, education, work history, and professional information (Optional)</p>
          </div>
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Professional Summary">
              <FormRow columns={1}>
                <FormGroup label="CV Summary" helper="Brief professional summary or career objective">
                  <textarea 
                    className="tibbna-input" 
                    rows={4}
                    value={form.cv_summary || ''} 
                    onChange={e => update('cv_summary', e.target.value)}
                    placeholder="e.g. Experienced healthcare professional with 10+ years in emergency medicine..."
                  />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Education">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Add educational qualifications (degrees, diplomas, certificates)
              </div>
              <div className="space-y-3">
                {(form.education || []).map((edu: any, index: number) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormGroup label="Degree/Certificate">
                        <input 
                          className="tibbna-input" 
                          value={edu.degree || ''} 
                          onChange={e => {
                            const updated = [...(form.education || [])];
                            updated[index] = { ...updated[index], degree: e.target.value };
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                          placeholder="e.g. Bachelor of Medicine"
                        />
                      </FormGroup>
                      <FormGroup label="Institution">
                        <input 
                          className="tibbna-input" 
                          value={edu.institution || ''} 
                          onChange={e => {
                            const updated = [...(form.education || [])];
                            updated[index] = { ...updated[index], institution: e.target.value };
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                          placeholder="e.g. University of Baghdad"
                        />
                      </FormGroup>
                      <FormGroup label="Field of Study">
                        <input 
                          className="tibbna-input" 
                          value={edu.field_of_study || ''} 
                          onChange={e => {
                            const updated = [...(form.education || [])];
                            updated[index] = { ...updated[index], field_of_study: e.target.value };
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                          placeholder="e.g. Medicine"
                        />
                      </FormGroup>
                      <FormGroup label="Graduation Year">
                        <input 
                          className="tibbna-input" 
                          type="number"
                          value={edu.graduation_year || ''} 
                          onChange={e => {
                            const updated = [...(form.education || [])];
                            updated[index] = { ...updated[index], graduation_year: e.target.value };
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                          placeholder="e.g. 2015"
                        />
                      </FormGroup>
                      <FormGroup label="GPA (Optional)">
                        <input 
                          className="tibbna-input" 
                          value={edu.gpa || ''} 
                          onChange={e => {
                            const updated = [...(form.education || [])];
                            updated[index] = { ...updated[index], gpa: e.target.value };
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                          placeholder="e.g. 3.8"
                        />
                      </FormGroup>
                      <div className="flex items-end">
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ width: '100%', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                          onClick={() => {
                            const updated = (form.education || []).filter((_: any, i: number) => i !== index);
                            setForm(prev => ({ ...prev, education: updated }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(form.education || []).length === 0 && (
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
                    No education records added yet
                  </div>
                )}
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const newEdu = [...(form.education || []), { degree: '', institution: '', field_of_study: '', graduation_year: '', gpa: '' }];
                    setForm(prev => ({ ...prev, education: newEdu }));
                  }}
                >
                  + Add Education
                </button>
              </div>
            </FormSection>

            <FormSection title="Work History">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Previous employment and work experience
              </div>
              <div className="space-y-3">
                {(form.work_history || []).map((work: any, index: number) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormGroup label="Company/Organization">
                        <input 
                          className="tibbna-input" 
                          value={work.company || ''} 
                          onChange={e => {
                            const updated = [...(form.work_history || [])];
                            updated[index] = { ...updated[index], company: e.target.value };
                            setForm(prev => ({ ...prev, work_history: updated }));
                          }}
                          placeholder="e.g. Al-Yarmouk Hospital"
                        />
                      </FormGroup>
                      <FormGroup label="Position/Title">
                        <input 
                          className="tibbna-input" 
                          value={work.position || ''} 
                          onChange={e => {
                            const updated = [...(form.work_history || [])];
                            updated[index] = { ...updated[index], position: e.target.value };
                            setForm(prev => ({ ...prev, work_history: updated }));
                          }}
                          placeholder="e.g. Emergency Physician"
                        />
                      </FormGroup>
                      <FormGroup label="Start Date">
                        <input 
                          className="tibbna-input" 
                          type="date"
                          value={work.start_date || ''} 
                          onChange={e => {
                            const updated = [...(form.work_history || [])];
                            updated[index] = { ...updated[index], start_date: e.target.value };
                            setForm(prev => ({ ...prev, work_history: updated }));
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="End Date">
                        <input 
                          className="tibbna-input" 
                          type="date"
                          value={work.end_date || ''} 
                          onChange={e => {
                            const updated = [...(form.work_history || [])];
                            updated[index] = { ...updated[index], end_date: e.target.value };
                            setForm(prev => ({ ...prev, work_history: updated }));
                          }}
                        />
                      </FormGroup>
                      <div className="md:col-span-2">
                        <FormGroup label="Responsibilities (Optional)">
                          <textarea 
                            className="tibbna-input" 
                            rows={2}
                            value={work.responsibilities || ''} 
                            onChange={e => {
                              const updated = [...(form.work_history || [])];
                              updated[index] = { ...updated[index], responsibilities: e.target.value };
                              setForm(prev => ({ ...prev, work_history: updated }));
                            }}
                            placeholder="Brief description of key responsibilities"
                          />
                        </FormGroup>
                      </div>
                      <div className="md:col-span-2">
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                          onClick={() => {
                            const updated = (form.work_history || []).filter((_: any, i: number) => i !== index);
                            setForm(prev => ({ ...prev, work_history: updated }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(form.work_history || []).length === 0 && (
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
                    No work history added yet
                  </div>
                )}
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const newWork = [...(form.work_history || []), { company: '', position: '', start_date: '', end_date: '', responsibilities: '' }];
                    setForm(prev => ({ ...prev, work_history: newWork }));
                  }}
                >
                  + Add Work Experience
                </button>
              </div>
            </FormSection>

            <FormSection title="Certifications & Licenses">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Professional certifications, licenses, and credentials
              </div>
              <div className="space-y-3">
                {(form.certifications || []).map((cert: any, index: number) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormGroup label="Certification/License Name">
                        <input 
                          className="tibbna-input" 
                          value={cert.name || ''} 
                          onChange={e => {
                            const updated = [...(form.certifications || [])];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                          placeholder="e.g. Board Certified Emergency Medicine"
                        />
                      </FormGroup>
                      <FormGroup label="Issuing Organization">
                        <input 
                          className="tibbna-input" 
                          value={cert.issuer || ''} 
                          onChange={e => {
                            const updated = [...(form.certifications || [])];
                            updated[index] = { ...updated[index], issuer: e.target.value };
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                          placeholder="e.g. Iraqi Medical Board"
                        />
                      </FormGroup>
                      <FormGroup label="Issue Date">
                        <input 
                          className="tibbna-input" 
                          type="date"
                          value={cert.issue_date || ''} 
                          onChange={e => {
                            const updated = [...(form.certifications || [])];
                            updated[index] = { ...updated[index], issue_date: e.target.value };
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Expiry Date (Optional)">
                        <input 
                          className="tibbna-input" 
                          type="date"
                          value={cert.expiry_date || ''} 
                          onChange={e => {
                            const updated = [...(form.certifications || [])];
                            updated[index] = { ...updated[index], expiry_date: e.target.value };
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Credential ID (Optional)">
                        <input 
                          className="tibbna-input" 
                          value={cert.credential_id || ''} 
                          onChange={e => {
                            const updated = [...(form.certifications || [])];
                            updated[index] = { ...updated[index], credential_id: e.target.value };
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                          placeholder="e.g. CERT-123456"
                        />
                      </FormGroup>
                      <div className="flex items-end">
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ width: '100%', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                          onClick={() => {
                            const updated = (form.certifications || []).filter((_: any, i: number) => i !== index);
                            setForm(prev => ({ ...prev, certifications: updated }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(form.certifications || []).length === 0 && (
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
                    No certifications added yet
                  </div>
                )}
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const newCert = [...(form.certifications || []), { name: '', issuer: '', issue_date: '', expiry_date: '', credential_id: '' }];
                    setForm(prev => ({ ...prev, certifications: newCert }));
                  }}
                >
                  + Add Certification
                </button>
              </div>
            </FormSection>

            <FormSection title="Languages">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Languages spoken and proficiency levels
              </div>
              <div className="space-y-3">
                {(form.languages || []).map((lang: any, index: number) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormGroup label="Language">
                        <input 
                          className="tibbna-input" 
                          value={lang.language || ''} 
                          onChange={e => {
                            const updated = [...(form.languages || [])];
                            updated[index] = { ...updated[index], language: e.target.value };
                            setForm(prev => ({ ...prev, languages: updated }));
                          }}
                          placeholder="e.g. Arabic, English"
                        />
                      </FormGroup>
                      <FormGroup label="Proficiency Level">
                        <select 
                          className="tibbna-input" 
                          value={lang.proficiency || 'INTERMEDIATE'} 
                          onChange={e => {
                            const updated = [...(form.languages || [])];
                            updated[index] = { ...updated[index], proficiency: e.target.value };
                            setForm(prev => ({ ...prev, languages: updated }));
                          }}
                        >
                          <option value="BASIC">Basic</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="ADVANCED">Advanced</option>
                          <option value="FLUENT">Fluent</option>
                          <option value="NATIVE">Native</option>
                        </select>
                      </FormGroup>
                      <div className="flex items-end">
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ width: '100%', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                          onClick={() => {
                            const updated = (form.languages || []).filter((_: any, i: number) => i !== index);
                            setForm(prev => ({ ...prev, languages: updated }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(form.languages || []).length === 0 && (
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
                    No languages added yet
                  </div>
                )}
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const newLang = [...(form.languages || []), { language: '', proficiency: 'INTERMEDIATE' }];
                    setForm(prev => ({ ...prev, languages: newLang }));
                  }}
                >
                  + Add Language
                </button>
              </div>
            </FormSection>

            <FormSection title="Skills">
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Professional skills and competencies
              </div>
              <div className="space-y-3">
                {(form.skills || []).map((skill: any, index: number) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <FormGroup label="Skill Name">
                          <input 
                            className="tibbna-input" 
                            value={skill.skill || ''} 
                            onChange={e => {
                              const updated = [...(form.skills || [])];
                              updated[index] = { ...updated[index], skill: e.target.value };
                              setForm(prev => ({ ...prev, skills: updated }));
                            }}
                            placeholder="e.g. Patient Assessment, CPR"
                          />
                        </FormGroup>
                      </div>
                      <FormGroup label="Proficiency Level">
                        <select 
                          className="tibbna-input" 
                          value={skill.level || 'INTERMEDIATE'} 
                          onChange={e => {
                            const updated = [...(form.skills || [])];
                            updated[index] = { ...updated[index], level: e.target.value };
                            setForm(prev => ({ ...prev, skills: updated }));
                          }}
                        >
                          <option value="BEGINNER">Beginner</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="ADVANCED">Advanced</option>
                          <option value="EXPERT">Expert</option>
                        </select>
                      </FormGroup>
                      <div className="flex items-end">
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ width: '100%', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none' }}
                          onClick={() => {
                            const updated = (form.skills || []).filter((_: any, i: number) => i !== index);
                            setForm(prev => ({ ...prev, skills: updated }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(form.skills || []).length === 0 && (
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', textAlign: 'center', color: '#9CA3AF' }}>
                    No skills added yet
                  </div>
                )}
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const newSkill = [...(form.skills || []), { skill: '', level: 'INTERMEDIATE' }];
                    setForm(prev => ({ ...prev, skills: newSkill }));
                  }}
                >
                  + Add Skill
                </button>
              </div>
            </FormSection>

            <FormActions>
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next: Review & Submit</button>
            </FormActions>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Review & Submit</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Personal Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Full Name</span><p style={{ fontWeight: 500 }}>{form.first_name} {form.middle_name} {form.last_name}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Date of Birth</span><p style={{ fontWeight: 500 }}>{form.date_of_birth}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Gender</span><p style={{ fontWeight: 500 }}>{form.gender}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Marital Status</span><p style={{ fontWeight: 500 }}>{form.marital_status}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Nationality</span><p style={{ fontWeight: 500 }}>{form.nationality}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>National ID</span><p style={{ fontWeight: 500 }}>{form.national_id}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Email</span><p style={{ fontWeight: 500 }}>{form.email}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Phone</span><p style={{ fontWeight: 500 }}>{form.phone}</p></div>
                {form.address && <div><span style={{ color: '#a3a3a3' }}>Address</span><p style={{ fontWeight: 500 }}>{form.address}</p></div>}
              </div>
            </FormSection>

            <FormSection title="Employment Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Job Title</span><p style={{ fontWeight: 500 }}>{form.job_title}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Department</span><p style={{ fontWeight: 500 }}>{dept?.name || '-'}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Specialty</span><p style={{ fontWeight: 500 }}>{form.specialty || '-'}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Category</span><p style={{ fontWeight: 500 }}>{form.employee_category.replace(/_/g, ' ')}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Employment Type</span><p style={{ fontWeight: 500 }}>{form.employment_type.replace(/_/g, ' ')}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Hire Date</span><p style={{ fontWeight: 500 }}>{form.date_of_hire}</p></div>
                {form.job_category_id && <div><span style={{ color: '#a3a3a3' }}>Job Category</span><p style={{ fontWeight: 500 }}>{form.job_category_id}</p></div>}
                {form.grade_id && <div><span style={{ color: '#a3a3a3' }}>Salary Grade</span><p style={{ fontWeight: 500 }}>{form.grade_id}</p></div>}
                {form.shift_id && <div><span style={{ color: '#a3a3a3' }}>Shift Pattern</span><p style={{ fontWeight: 500 }}>{form.shift_id}</p></div>}
              </div>
            </FormSection>

            {(form.basic_salary || form.payment_frequency || form.housing_allowance || form.transport_allowance || form.meal_allowance) && (
              <FormSection title="Compensation Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                  {form.basic_salary && <div><span style={{ color: '#a3a3a3' }}>Basic Salary</span><p style={{ fontWeight: 500 }}>{form.basic_salary.toLocaleString()} IQD</p></div>}
                  {form.payment_frequency && <div><span style={{ color: '#a3a3a3' }}>Payment Frequency</span><p style={{ fontWeight: 500 }}>{form.payment_frequency.replace(/_/g, ' ')}</p></div>}
                  {form.housing_allowance && <div><span style={{ color: '#a3a3a3' }}>Housing Allowance</span><p style={{ fontWeight: 500 }}>${form.housing_allowance.toLocaleString()}</p></div>}
                  {form.transport_allowance && <div><span style={{ color: '#a3a3a3' }}>Transport Allowance</span><p style={{ fontWeight: 500 }}>${form.transport_allowance.toLocaleString()}</p></div>}
                  {form.meal_allowance && <div><span style={{ color: '#a3a3a3' }}>Meal Allowance</span><p style={{ fontWeight: 500 }}>${form.meal_allowance.toLocaleString()}</p></div>}
                </div>
              </FormSection>
            )}

            {(form.pension_eligible !== undefined || form.social_security_number || form.tax_id_number || form.settlement_eligible !== undefined) && (
              <FormSection title="Settlement Rules & Deductions">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                  {form.pension_eligible !== undefined && <div><span style={{ color: '#a3a3a3' }}>Pension Eligible</span><p style={{ fontWeight: 500 }}>{form.pension_eligible ? 'Yes' : 'No'}</p></div>}
                  {form.pension_scheme && <div><span style={{ color: '#a3a3a3' }}>Pension Scheme</span><p style={{ fontWeight: 500 }}>{form.pension_scheme}</p></div>}
                  {form.pension_contribution_rate && <div><span style={{ color: '#a3a3a3' }}>Employee Pension Rate</span><p style={{ fontWeight: 500 }}>{form.pension_contribution_rate}%</p></div>}
                  {form.employer_pension_rate && <div><span style={{ color: '#a3a3a3' }}>Employer Pension Rate</span><p style={{ fontWeight: 500 }}>{form.employer_pension_rate}%</p></div>}
                  {form.pension_start_date && <div><span style={{ color: '#a3a3a3' }}>Pension Start Date</span><p style={{ fontWeight: 500 }}>{form.pension_start_date}</p></div>}
                  {form.social_security_number && <div><span style={{ color: '#a3a3a3' }}>Social Security Number</span><p style={{ fontWeight: 500 }}>{form.social_security_number}</p></div>}
                  {form.social_security_rate && <div><span style={{ color: '#a3a3a3' }}>Social Security Rate</span><p style={{ fontWeight: 500 }}>{form.social_security_rate}%</p></div>}
                  {form.tax_id_number && <div><span style={{ color: '#a3a3a3' }}>Tax ID Number</span><p style={{ fontWeight: 500 }}>{form.tax_id_number}</p></div>}
                  {form.tax_exemption_amount !== undefined && <div><span style={{ color: '#a3a3a3' }}>Tax Exemption Amount</span><p style={{ fontWeight: 500 }}>{form.tax_exemption_amount.toLocaleString()} IQD</p></div>}
                  {form.settlement_eligible !== undefined && <div><span style={{ color: '#a3a3a3' }}>Settlement Eligible</span><p style={{ fontWeight: 500 }}>{form.settlement_eligible ? 'Yes' : 'No'}</p></div>}
                  {form.settlement_calculation_method && <div><span style={{ color: '#a3a3a3' }}>Settlement Method</span><p style={{ fontWeight: 500 }}>{form.settlement_calculation_method.replace(/_/g, ' ')}</p></div>}
                  {form.gratuity_eligible !== undefined && <div><span style={{ color: '#a3a3a3' }}>Gratuity Eligible</span><p style={{ fontWeight: 500 }}>{form.gratuity_eligible ? 'Yes' : 'No'}</p></div>}
                  {form.notice_period_days && <div><span style={{ color: '#a3a3a3' }}>Notice Period</span><p style={{ fontWeight: 500 }}>{form.notice_period_days} days</p></div>}
                </div>
              </FormSection>
            )}

            {(form.bank_name || form.bank_account_number) && (
              <FormSection title="Bank Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
                  {form.bank_name && <div><span style={{ color: '#a3a3a3' }}>Bank Name</span><p style={{ fontWeight: 500 }}>{form.bank_name}</p></div>}
                  {form.bank_account_number && <div><span style={{ color: '#a3a3a3' }}>Account Number</span><p style={{ fontWeight: 500 }}>{form.bank_account_number}</p></div>}
                </div>
              </FormSection>
            )}

            {(form.cv_summary || (form.education && form.education.length > 0) || (form.work_history && form.work_history.length > 0) || (form.certifications && form.certifications.length > 0) || (form.languages && form.languages.length > 0) || (form.skills && form.skills.length > 0)) && (
              <FormSection title="Profile Information">
                {form.cv_summary && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>CV Summary</span>
                    <p style={{ fontWeight: 500, marginTop: '4px' }}>{form.cv_summary}</p>
                  </div>
                )}
                {form.education && form.education.length > 0 && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>Education ({form.education.length})</span>
                    {form.education.map((edu, index) => (
                      <p key={index} style={{ fontWeight: 500, marginTop: '4px' }}>
                        {edu.degree} in {edu.field_of_study} - {edu.institution} ({edu.graduation_year})
                      </p>
                    ))}
                  </div>
                )}
                {form.work_history && form.work_history.length > 0 && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>Work History ({form.work_history.length})</span>
                    {form.work_history.map((work, index) => (
                      <p key={index} style={{ fontWeight: 500, marginTop: '4px' }}>
                        {work.position} at {work.company} ({work.start_date} - {work.end_date || 'Present'})
                      </p>
                    ))}
                  </div>
                )}
                {form.certifications && form.certifications.length > 0 && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>Certifications ({form.certifications.length})</span>
                    {form.certifications.map((cert, index) => (
                      <p key={index} style={{ fontWeight: 500, marginTop: '4px' }}>
                        {cert.name} - {cert.issuing_organization} ({cert.issue_date})
                      </p>
                    ))}
                  </div>
                )}
                {form.languages && form.languages.length > 0 && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>Languages ({form.languages.length})</span>
                    {form.languages.map((lang, index) => (
                      <p key={index} style={{ fontWeight: 500, marginTop: '4px' }}>
                        {lang.language} - {lang.proficiency}
                      </p>
                    ))}
                  </div>
                )}
                {form.skills && form.skills.length > 0 && (
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3' }}>Skills ({form.skills.length})</span>
                    {form.skills.map((skill, index) => (
                      <p key={index} style={{ fontWeight: 500, marginTop: '4px' }}>
                        {skill.skill} - {skill.level}
                      </p>
                    ))}
                  </div>
                )}
              </FormSection>
            )}

            {(form.emergency_contact_name || form.emergency_contact_relationship || form.emergency_contact_phone) && (
              <FormSection title="Emergency Contact">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                  {form.emergency_contact_name && <div><span style={{ color: '#a3a3a3' }}>Name</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_name}</p></div>}
                  {form.emergency_contact_relationship && <div><span style={{ color: '#a3a3a3' }}>Relationship</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_relationship}</p></div>}
                  {form.emergency_contact_phone && <div><span style={{ color: '#a3a3a3' }}>Phone</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_phone}</p></div>}
                </div>
              </FormSection>
            )}

            <FormActions>
              <button className="btn-secondary" onClick={handleBack}>Back to Edit</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}>
                <Save size={16} /> Create Employee
              </button>
            </FormActions>
          </div>
        </div>
      )}
    </>
  );
}
