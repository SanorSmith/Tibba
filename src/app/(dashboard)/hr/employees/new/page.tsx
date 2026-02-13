'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Briefcase } from 'lucide-react';
import { createEmployee } from '@/lib/actions/employees';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import { toast } from 'sonner';

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name_arabic: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  national_id: string;
  email: string;
  phone: string;
  address: string;
  employment_type: string;
  job_title: string;
  department_id: string;
  salary_grade: string;
  hire_date: string;
  base_salary: string;
  bank_name: string;
  bank_account_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

const initialForm: FormData = {
  first_name: '',
  middle_name: '',
  last_name: '',
  full_name_arabic: '',
  date_of_birth: '',
  gender: 'MALE',
  marital_status: 'SINGLE',
  nationality: 'Iraqi',
  national_id: '',
  email: '',
  phone: '',
  address: '',
  employment_type: 'FULL_TIME',
  job_title: '',
  department_id: '',
  salary_grade: 'G5',
  hire_date: new Date().toISOString().split('T')[0],
  base_salary: '',
  bank_name: '',
  bank_account_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) setDepartments(result.data);
      })
      .catch(err => console.error('Failed to load departments:', err));
  }, []);

  const update = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.date_of_birth) e.date_of_birth = 'Date of birth is required';
    if (!form.national_id.trim()) e.national_id = 'National ID is required';
    if (!form.email.trim()) e.email = 'Work email is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.job_title.trim()) e.job_title = 'Job title is required';
    if (!form.department_id) e.department_id = 'Department is required';
    if (!form.hire_date) e.hire_date = 'Hire date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await createEmployee({
      first_name: form.first_name,
      middle_name: form.middle_name || null,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      job_title: form.job_title,
      department_id: form.department_id || null,
      employment_type: form.employment_type,
      hire_date: form.hire_date,
      salary_grade: form.salary_grade || null,
      base_salary: form.base_salary ? parseFloat(form.base_salary) : null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      marital_status: form.marital_status || null,
      nationality: form.nationality || 'Iraqi',
      national_id: form.national_id || null,
      emergency_contact: form.emergency_contact_name ? {
        name: form.emergency_contact_name,
        phone: form.emergency_contact_phone,
        relationship: form.emergency_contact_relationship,
      } : null,
    });

    if (result.success) {
      setGeneratedId(result.data?.employee_number || '');
      setSubmitted(true);
      toast.success(`${form.first_name} ${form.last_name} added successfully`);
    } else {
      toast.error(result.error || 'Failed to save employee');
    }

    setSubmitting(false);
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
            <p className="page-description">Step {step} of 3</p>
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
              { n: 3, label: 'Review & Submit', icon: Save },
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
                  {i < 2 && (
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
              <FormRow columns={1}>
                <FormGroup label="Full Name (Arabic)" helper="الاسم الكامل بالعربية">
                  <input className="tibbna-input" dir="rtl" value={form.full_name_arabic} onChange={e => update('full_name_arabic', e.target.value)} placeholder="أحمد حسن البياتي" />
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
                  <input className="tibbna-input" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
                </FormGroup>
                <FormGroup label="National ID" required error={errors.national_id}>
                  <input className="tibbna-input" value={form.national_id} onChange={e => update('national_id', e.target.value)} placeholder="e.g. 12345678901" />
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
                  <select className="tibbna-input" value={form.department_id} onChange={e => update('department_id', e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={3}>
                <FormGroup label="Employment Type">
                  <select className="tibbna-input" value={form.employment_type} onChange={e => update('employment_type', e.target.value)}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="TEMPORARY">Temporary</option>
                  </select>
                </FormGroup>
                <FormGroup label="Date of Hire" required error={errors.hire_date}>
                  <input className="tibbna-input" type="date" value={form.hire_date} onChange={e => update('hire_date', e.target.value)} />
                </FormGroup>
                <FormGroup label="Salary Grade">
                  <select className="tibbna-input" value={form.salary_grade} onChange={e => update('salary_grade', e.target.value)}>
                    <option value="">Select Grade</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={`G${i + 1}`}>G{i + 1}</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormSection title="Compensation">
              <FormRow columns={2}>
                <FormGroup label="Basic Salary (IQD)" helper="Monthly basic salary">
                  <input className="tibbna-input" type="number" value={form.base_salary} onChange={e => update('base_salary', e.target.value)} placeholder="e.g. 2000000" min="0" step="1000" />
                </FormGroup>
                <FormGroup label="Bank Name">
                  <input className="tibbna-input" value={form.bank_name} onChange={e => update('bank_name', e.target.value)} placeholder="e.g. Rasheed Bank" />
                </FormGroup>
              </FormRow>
              <FormRow columns={1}>
                <FormGroup label="Bank Account Number">
                  <input className="tibbna-input" value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} placeholder="e.g. 1234567890" />
                </FormGroup>
              </FormRow>
            </FormSection>

            <FormActions>
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next: Review</button>
            </FormActions>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Review & Submit</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Personal Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Full Name</span><p style={{ fontWeight: 500 }}>{form.first_name} {form.middle_name} {form.last_name}</p></div>
                {form.full_name_arabic && <div><span style={{ color: '#a3a3a3' }}>Arabic Name</span><p style={{ fontWeight: 500 }} dir="rtl">{form.full_name_arabic}</p></div>}
                <div><span style={{ color: '#a3a3a3' }}>Date of Birth</span><p style={{ fontWeight: 500 }}>{form.date_of_birth}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Gender</span><p style={{ fontWeight: 500 }}>{form.gender}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Marital Status</span><p style={{ fontWeight: 500 }}>{form.marital_status}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>National ID</span><p style={{ fontWeight: 500 }}>{form.national_id}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Email</span><p style={{ fontWeight: 500 }}>{form.email}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Phone</span><p style={{ fontWeight: 500 }}>{form.phone}</p></div>
              </div>
            </FormSection>

            <FormSection title="Employment Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Job Title</span><p style={{ fontWeight: 500 }}>{form.job_title}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Department</span><p style={{ fontWeight: 500 }}>{dept?.name || '-'}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Employment Type</span><p style={{ fontWeight: 500 }}>{form.employment_type.replace(/_/g, ' ')}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Hire Date</span><p style={{ fontWeight: 500 }}>{form.hire_date}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Salary Grade</span><p style={{ fontWeight: 500 }}>{form.salary_grade || '-'}</p></div>
                {form.base_salary && <div><span style={{ color: '#a3a3a3' }}>Basic Salary</span><p style={{ fontWeight: 500 }}>{(parseFloat(form.base_salary) / 1000).toFixed(0)}K IQD</p></div>}
                {form.bank_name && <div><span style={{ color: '#a3a3a3' }}>Bank</span><p style={{ fontWeight: 500 }}>{form.bank_name}</p></div>}
              </div>
            </FormSection>

            {form.emergency_contact_name && (
              <FormSection title="Emergency Contact">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                  <div><span style={{ color: '#a3a3a3' }}>Name</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_name}</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Relationship</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_relationship}</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Phone</span><p style={{ fontWeight: 500 }}>{form.emergency_contact_phone}</p></div>
                </div>
              </FormSection>
            )}

            <FormActions>
              <button className="btn-secondary" onClick={handleBack}>Back to Edit</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={submitting}>
                <Save size={16} /> {submitting ? 'Creating...' : 'Create Employee'}
              </button>
            </FormActions>
          </div>
        </div>
      )}
    </>
  );
}
