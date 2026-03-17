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
      const response = await fetch(`/api/staff?id=${staffId}`);
      const data = await response.json();
      
      if (response.ok) {
        const staffMember = data.staff;
        if (staffMember) {
          setStaff(staffMember);
          setForm({
            firstName: staffMember.firstName || '',
            middleName: staffMember.middleName || '',
            lastName: staffMember.lastName || '',
            email: staffMember.email || '',
            phone: staffMember.phone || '',
            role: staffMember.role || 'Staff',
            unit: staffMember.unit || '',
            specialty: staffMember.specialty || '',
            workspaceId: staffMember.workspaceId || 'default-workspace',
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
