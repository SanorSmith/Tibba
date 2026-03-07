'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StaffFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  unit: string;
  specialty: string;
  workspaceId?: string;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Staff',
    unit: '',
    specialty: '',
    workspaceId: 'default-workspace',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id) {
      loadStaff(params.id as string);
    }
  }, [params.id]);

  const loadStaff = async (staffId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/staff');
      const data = await response.json();
      
      if (response.ok) {
        const staffMember = data.staff.find((s: any) => s.staffid === staffId);
        if (staffMember) {
          setStaff(staffMember);
          setForm({
            firstName: staffMember.firstname || '',
            middleName: staffMember.middlename || '',
            lastName: staffMember.lastname || '',
            email: staffMember.email || '',
            phone: staffMember.phone || '',
            role: staffMember.role || 'Staff',
            unit: staffMember.unit || '',
            specialty: staffMember.specialty || '',
            workspaceId: staffMember.workspaceid || 'default-workspace',
          });
        } else {
          toast.error('Staff member not found');
          router.push('/hr/employees');
        }
      } else {
        console.error('Error loading staff:', data.error);
        toast.error('Failed to load staff member');
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff member');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof StaffFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      console.log('Updating staff member:', params.id, form);

      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: params.id,
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          unit: form.unit,
          specialty: form.specialty,
          workspaceId: form.workspaceId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Staff member updated successfully:', result);
        toast.success('Staff member updated successfully');
        router.push('/hr/employees');
      } else {
        console.error('Error updating staff member:', result);
        toast.error(result.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff member:', error);
      toast.error('Failed to update staff member');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
          <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Loading staff member...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252' }}>Staff member not found</p>
          <Link href="/hr/employees">
            <button className="btn-secondary mt-4">Back to Employees</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <Link href="/hr/employees" className="btn-secondary mb-4 inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Employees
          </Link>
          <h2 className="page-title">Edit Staff Member</h2>
          <p className="page-description">Update staff member information</p>
        </div>
      </div>

      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#374151' }}>Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="tibbna-label">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className={`tibbna-input ${errors.firstName ? 'border-red-500' : ''}`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="tibbna-label">Middle Name</label>
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={(e) => updateField('middleName', e.target.value)}
                    className="tibbna-input"
                    placeholder="Enter middle name (optional)"
                  />
                </div>
                <div>
                  <label className="tibbna-label">Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className={`tibbna-input ${errors.lastName ? 'border-red-500' : ''}`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#374151' }}>Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="tibbna-label">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={`tibbna-input ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="tibbna-label">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={`tibbna-input ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#374151' }}>Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="tibbna-label">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    className="tibbna-input"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Technician">Technician</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="tibbna-label">Department/Unit</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                    className="tibbna-input"
                    placeholder="Enter department or unit"
                  />
                </div>
                <div>
                  <label className="tibbna-label">Specialty</label>
                  <input
                    type="text"
                    value={form.specialty}
                    onChange={(e) => updateField('specialty', e.target.value)}
                    className="tibbna-input"
                    placeholder="Enter specialty (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-6 border-t">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/hr/employees">
                <button type="button" className="btn-secondary">
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
          national_id: form.national_id,
      email: form.email,
      email_work: form.email,
      phone: form.phone,
      phone_mobile: form.phone,
      address: form.address || '',
      employment_type: form.employment_type,
      employee_category: form.employee_category,
      job_title: form.job_title,
      department_id: form.department_id,
      department_name: dept?.name || employee.department_name,
      grade_id: form.grade_id || '',
      date_of_hire: form.date_of_hire,
      shift_id: form.shift_id || '',
      basic_salary: form.basic_salary || 0,
      bank_account_number: form.bank_account_number || '',
      bank_name: form.bank_name || '',
    };

    try {
      const success = dataStore.updateEmployee(employee.id, updates);
      if (success) {
        setSaved(true);
        toast.success(`${form.first_name} ${form.last_name} updated successfully`);
      } else {
        toast.error('Failed to update employee');
      }
    } catch (error) {
      console.error('Update employee error:', error);
      toast.error('Error updating employee');
    }
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
