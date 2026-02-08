'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import type { EmployeeFormData } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import employeesData from '@/data/hr/employees.json';
import departmentsData from '@/data/hr/departments.json';
import payrollData from '@/data/hr/payroll.json';
import attendanceData from '@/data/hr/attendance.json';

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employee = employeesData.employees.find(e => e.id === params.id);

  const [form, setForm] = useState<EmployeeFormData>(() => {
    if (!employee) return {} as EmployeeFormData;
    const emp = employee as any;
    return {
      first_name: emp.first_name,
      middle_name: '',
      last_name: emp.last_name,
      full_name_arabic: emp.full_name_arabic || '',
      date_of_birth: emp.date_of_birth,
      gender: emp.gender as 'MALE' | 'FEMALE',
      marital_status: (emp.marital_status || 'SINGLE') as 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED',
      nationality: emp.nationality,
      national_id: emp.national_id,
      email: emp.email_work || emp.email || '',
      phone: emp.phone_mobile || emp.phone || '',
      address: emp.address || '',
      employment_type: emp.employment_type as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY',
      employee_category: emp.employee_category as 'MEDICAL_STAFF' | 'NURSING' | 'ADMINISTRATIVE' | 'SUPPORT' | 'TECHNICAL',
      job_title: emp.job_title,
      department_id: emp.department_id,
      grade_id: emp.grade_id || '',
      date_of_hire: emp.date_of_hire,
      shift_id: emp.shift_id || '',
      bank_account_number: '',
      bank_name: '',
      basic_salary: emp.basic_salary,
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Employee Not Found</h2>
        <Link href="/hr/employees"><button className="btn-primary">Back to Directory</button></Link>
      </div>
    );
  }

  const update = (field: keyof EmployeeFormData, value: string | number | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.job_title.trim()) e.job_title = 'Required';
    if (!form.department_id) e.department_id = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) setSaved(true);
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <Save size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Changes Saved Successfully</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          {form.first_name} {form.last_name}&apos;s profile has been updated.
        </p>
        <div className="flex gap-3 mt-4">
          <Link href={`/hr/employees/${employee.id}`}>
            <button className="btn-primary">View Profile</button>
          </Link>
          <Link href="/hr/employees">
            <button className="btn-secondary">Back to Directory</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href={`/hr/employees/${employee.id}`}>
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <h2 className="page-title">Edit Employee</h2>
            <p className="page-description">{employee.employee_number} - {employee.first_name} {employee.last_name}</p>
          </div>
        </div>
      </div>

      <div className="tibbna-card">
        <div className="tibbna-card-content space-y-5">
          <FormSection title="Personal Information">
            <FormRow columns={3}>
              <FormGroup label="First Name" required error={errors.first_name}>
                <input className="tibbna-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </FormGroup>
              <FormGroup label="Middle Name">
                <input className="tibbna-input" value={form.middle_name} onChange={e => update('middle_name', e.target.value)} />
              </FormGroup>
              <FormGroup label="Last Name" required error={errors.last_name}>
                <input className="tibbna-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </FormGroup>
            </FormRow>
            <FormRow columns={1}>
              <FormGroup label="Full Name (Arabic)">
                <input className="tibbna-input" dir="rtl" value={form.full_name_arabic} onChange={e => update('full_name_arabic', e.target.value)} />
              </FormGroup>
            </FormRow>
            <FormRow columns={3}>
              <FormGroup label="Date of Birth">
                <input className="tibbna-input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
              </FormGroup>
              <FormGroup label="Gender">
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
              <FormGroup label="National ID">
                <input className="tibbna-input" value={form.national_id} onChange={e => update('national_id', e.target.value)} />
              </FormGroup>
              <FormGroup label="Nationality">
                <input className="tibbna-input" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
              </FormGroup>
            </FormRow>
          </FormSection>

          <FormSection title="Contact">
            <FormRow columns={2}>
              <FormGroup label="Work Email" required error={errors.email}>
                <input className="tibbna-input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
              </FormGroup>
              <FormGroup label="Mobile Phone" required error={errors.phone}>
                <input className="tibbna-input" value={form.phone} onChange={e => update('phone', e.target.value)} />
              </FormGroup>
            </FormRow>
            <FormRow columns={1}>
              <FormGroup label="Address">
                <input className="tibbna-input" value={form.address} onChange={e => update('address', e.target.value)} />
              </FormGroup>
            </FormRow>
          </FormSection>

          <FormSection title="Employment">
            <FormRow columns={2}>
              <FormGroup label="Job Title" required error={errors.job_title}>
                <input className="tibbna-input" value={form.job_title} onChange={e => update('job_title', e.target.value)} />
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
              <FormGroup label="Category">
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
              <FormGroup label="Date of Hire">
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
                    <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Basic Salary (IQD)">
                <input className="tibbna-input" type="number" value={form.basic_salary || ''} onChange={e => update('basic_salary', e.target.value ? Number(e.target.value) : undefined)} />
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

          <FormActions>
            <Link href={`/hr/employees/${employee.id}`}><button className="btn-secondary">Cancel</button></Link>
            <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
              <Save size={16} /> Save Changes
            </button>
          </FormActions>
        </div>
      </div>
    </>
  );
}
