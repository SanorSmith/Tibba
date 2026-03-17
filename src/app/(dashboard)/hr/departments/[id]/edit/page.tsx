'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Users, Phone, Mail, MapPin, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  head_of_department?: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DepartmentFormData {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
}

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [department, setDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentFormData>({
    name: '',
    contact_email: '',
    contact_phone: '',
    location: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDepartment();
  }, [departmentId]);

  const fetchDepartment = async () => {
    try {
      setFetching(true);
      const response = await fetch(`/api/departments/${departmentId}`);
      const data = await response.json();

      if (data.success) {
        setDepartment(data.data);
        setForm({
          name: data.data.name,
          contact_email: data.data.contact_email || '',
          contact_phone: data.data.contact_phone || '',
          location: data.data.location || '',
        });
      } else {
        toast.error(data.error || 'Failed to fetch department');
        router.push('/departments/list');
      }
    } catch (error) {
      toast.error('Failed to fetch department');
      router.push('/departments/list');
    } finally {
      setFetching(false);
    }
  };

  const update = (field: keyof DepartmentFormData, value: string | number | boolean | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Department name is required';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      e.contact_email = 'Invalid email format';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Department updated successfully!');
        router.push('/departments/list');
      } else {
        toast.error(data.error || 'Failed to update department');
      }
    } catch (error) {
      toast.error('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Department not found</h3>
            <p className="text-gray-500 mb-4">The department you're looking for doesn't exist.</p>
            <Link href="/departments/list">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Back to Departments
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/departments/list" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Departments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Department</h1>
        <p className="text-gray-500">Update department information</p>
      </div>

      {/* Department Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{department.name}</h2>
            <p className="text-sm text-gray-500">Department Code: {department.code}</p>
          </div>
          <div className="ml-auto">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              department.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {department.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {department.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Description:</span> {department.description}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          {department.contact_email && (
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400" />
              <span className="text-gray-600">{department.contact_email}</span>
            </div>
          )}
          {department.contact_phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              <span className="text-gray-600">{department.contact_phone}</span>
            </div>
          )}
          {department.location && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              <span className="text-gray-600">{department.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Department Information</h3>
          
          <div className="space-y-6">
            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g., Emergency Department"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  className={`pl-10 pr-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={form.contact_email || ''}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="e.g., emergency@tibbna.iq"
                />
              </div>
              {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="tel"
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.contact_phone || ''}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder="e.g., +964 770 123 4567"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.location || ''}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="e.g., Building A, Floor 1"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <Link href="/departments/list">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Updating...' : 'Update Department'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
