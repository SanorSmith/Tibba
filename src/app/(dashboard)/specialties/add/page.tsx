'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SpecialtyFormData {
  name: string;
  description: string;
  department_id: string;
  code: string;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

export default function AddSpecialtyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState<SpecialtyFormData>({
    name: '',
    description: '',
    department_id: '',
    code: '',
    is_active: true,
  });

  // Load departments from database
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      if (response.ok) {
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

  const updateField = (field: keyof SpecialtyFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = 'Specialty name is required';
    }
    if (!formData.department_id.trim()) {
      newErrors.department_id = 'Department is required';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Specialty code is required';
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
      console.log('Creating specialty:', formData);

      const response = await fetch('/api/specialties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          department_id: formData.department_id,
          code: formData.code,
          is_active: formData.is_active,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Specialty created successfully:', result);
        toast.success('Specialty created successfully');
        router.push('/specialties');
      } else {
        console.error('Error creating specialty:', result);
        toast.error(result.error || 'Failed to create specialty');
      }
    } catch (error) {
      console.error('Error creating specialty:', error);
      toast.error('Failed to create specialty');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    updateField('name', name);
    if (name && !formData.code) {
      const code = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
      updateField('code', code);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/specialties" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} />
          Back to Specialties
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Medical Specialty</h1>
        <p className="text-gray-600">Create a new medical specialty for the hospital system.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. Cardiology, Neurology, Pediatrics"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. CARD, NEUR, PEDI"
                    value={formData.code}
                    onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                  <p className="mt-1 text-xs text-gray-500">3-10 character code for identification</p>
                </div>
              </div>
            </div>

            {/* Department Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  {loadingDepartments ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      Loading departments...
                    </div>
                  ) : (
                    <select
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.department_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.department_id}
                      onChange={(e) => updateField('department_id', e.target.value)}
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.department_id && <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>}
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => updateField('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Active (available for staff assignment)
                  </label>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Describe the medical specialty, typical conditions treated, and services provided..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Provide details about this specialty for staff and patients
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/specialties')}
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
                    Creating Specialty...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Specialty
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
