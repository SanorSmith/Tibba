'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface EmployeeFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  unit: string;
  specialty: string;
  dateOfBirth: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  code: string;
  is_active: boolean;
}

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Staff',
    dateOfBirth: '',
    unit: '',
    specialty: '',
  });

  // Load departments and specialties from database
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadDepartments(),
      loadSpecialties()
    ]);
  };

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      if (response.ok) {
        // The API returns { success: true, data: [...], count: number }
        setDepartments(data.data || []);
        console.log('Departments loaded:', data.data?.length || 0, 'departments');
      } else {
        console.error('Error loading departments:', data.error);
        toast.error(data.error || 'Failed to load departments');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoadingDepartments(false);
    }
  };

  const loadSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const response = await fetch('/api/specialties');
      const data = await response.json();
      
      if (response.ok) {
        setSpecialties(data.data || []);
        console.log('Specialties loaded:', data.data?.length || 0, 'specialties');
      } else {
        console.error('Error loading specialties:', data.error);
        toast.error(data.error || 'Failed to load specialties');
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast.error('Failed to load specialties');
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const updateField = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear specialty when department changes
    if (field === 'unit') {
      setFormData(prev => ({ ...prev, specialty: '' }));
    }
  };

  // Get filtered specialties based on selected department
  const getFilteredSpecialties = () => {
    if (!formData.unit) {
      return specialties.filter(s => s.is_active);
    }
    
    const selectedDepartment = departments.find(d => d.name === formData.unit);
    if (!selectedDepartment) {
      return specialties.filter(s => s.is_active);
    }
    
    return specialties.filter(s => 
      s.is_active && s.department_id === selectedDepartment.id
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.unit) {
      newErrors.unit = 'Department is required';
    }
    if (!formData.specialty) {
      newErrors.specialty = 'Specialty is required';
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

    setLoading(true);
    try {
      console.log('Creating staff member:', formData);

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          unit: formData.unit,
          specialty: formData.specialty,
          dateOfBirth: formData.dateOfBirth,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Staff member created successfully:', result);
        toast.success('Staff member created successfully');
        router.push('/hr/employees');
      } else {
        console.error('Error creating staff member:', result);
        toast.error(result.error || 'Failed to create staff member');
      }
    } catch (error) {
      console.error('Error creating staff member:', error);
      toast.error('Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/hr/employees" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} />
          Back to Employees
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Staff Member</h1>
        <p className="text-gray-600">Fill in the information below to add a new staff member to the system.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. Ahmed"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Hassan"
                    value={formData.middleName}
                    onChange={(e) => updateField('middleName', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. Al-Bayati"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>
              </div>
              
              {/* Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
                  <p className="mt-1 text-xs text-gray-500">Used to generate Staff ID</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. ahmed.albayati@hospital.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. +964 770 123 4567"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department/Unit</label>
                  {loadingDepartments ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      Loading departments...
                    </div>
                  ) : (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.specialty}
                    onChange={(e) => updateField('specialty', e.target.value)}
                    disabled={!formData.unit}
                  >
                    <option value="">
                      {formData.unit ? 'Select a specialty' : 'Select a department first'}
                    </option>
                    {getFilteredSpecialties().map((specialty) => (
                      <option key={specialty.id} value={specialty.name}>
                        {specialty.name} ({specialty.code})
                      </option>
                    ))}
                  </select>
                  {formData.unit && getFilteredSpecialties().length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">No specialties available for this department</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/hr/employees')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding Staff...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Staff Member
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
