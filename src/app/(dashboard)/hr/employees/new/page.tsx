'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Briefcase, Building2, CreditCard } from 'lucide-react';
import type { EmployeeFormData } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import departmentsData from '@/data/hr/departments.json';
import payrollData from '@/data/hr/payroll.json';
import attendanceData from '@/data/hr/attendance.json';

const initialForm: EmployeeFormData = {
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
  employee_category: 'ADMINISTRATIVE',
  job_title: '',
  department_id: '',
  grade_id: '',
  date_of_hire: new Date().toISOString().split('T')[0],
  shift_id: '',
  bank_account_number: '',
  bank_name: '',
  basic_salary: undefined,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployeeFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  const update = (field: keyof EmployeeFormData, value: string | number | undefined) => {
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
    if (!form.date_of_hire) e.date_of_hire = 'Hire date is required';
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

  const handleSubmit = () => {
    const empNum = `EMP-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setGeneratedId(empNum);
    setSubmitted(true);
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

  const dept = departmentsData.departments.find(d => d.id === form.department_id);

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
                    {departmentsData.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>
              <FormRow columns={3}>
                <FormGroup label="Employee Category" required>
                  <select className="tibbna-input" value={form.employee_category} onChange={e => update('employee_category', e.target.value)}>
                    <option value="MEDICAL_STAFF">Medical Staff</option>
                    <option value="NURSING">Nursing</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="SUPPORT">Support</option>
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
                <div><span style={{ color: '#a3a3a3' }}>Category</span><p style={{ fontWeight: 500 }}>{form.employee_category.replace(/_/g, ' ')}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Employment Type</span><p style={{ fontWeight: 500 }}>{form.employment_type.replace(/_/g, ' ')}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Hire Date</span><p style={{ fontWeight: 500 }}>{form.date_of_hire}</p></div>
                {form.basic_salary && <div><span style={{ color: '#a3a3a3' }}>Basic Salary</span><p style={{ fontWeight: 500 }}>{(form.basic_salary / 1000).toFixed(0)}K IQD</p></div>}
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
