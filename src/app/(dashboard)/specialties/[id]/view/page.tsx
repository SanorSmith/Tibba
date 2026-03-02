'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Building2, Star, Users, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

export default function ViewSpecialtyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  useEffect(() => {
    loadSpecialty();
  }, [resolvedParams.id]);

  const loadSpecialty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/specialties/${resolvedParams.id}`);
      const data = await response.json();
      
      if (response.ok) {
        const specialtyData = data.data;
        setSpecialty(specialtyData);
        
        // Load department if linked
        if (specialtyData.department_id) {
          await loadDepartment(specialtyData.department_id);
        }
      } else {
        console.error('Error loading specialty:', data.error);
        toast.error(data.error || 'Failed to load specialty');
        router.push('/specialties');
      }
    } catch (error) {
      console.error('Error loading specialty:', error);
      toast.error('Failed to load specialty');
      router.push('/specialties');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartment = async (departmentId: string) => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      if (response.ok) {
        const departments = data.data || [];
        const dept = departments.find((d: Department) => d.id === departmentId);
        if (dept) {
          setDepartment(dept);
        }
      }
    } catch (error) {
      console.error('Error loading department:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!specialty) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Specialty not found</h3>
          <p className="text-gray-600 mb-4">The specialty you're looking for doesn't exist.</p>
          <Link href="/specialties">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Back to Specialties
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/specialties" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} />
          Back to Specialties
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{specialty.name}</h1>
            <p className="text-gray-600">Specialty details and information</p>
          </div>
          <Link href={`/specialties/${resolvedParams.id}/edit`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Edit size={16} />
              Edit Specialty
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Specialty Name</label>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-900">{specialty.name}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Specialty Code</label>
                <div className="mt-1">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {specialty.code}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    specialty.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {specialty.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <div className="mt-1">
                  {department ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-900">{department.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">No department assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <div className="text-gray-700">
              {specialty.description ? (
                <p>{specialty.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(specialty.created_at).toLocaleDateString()} at {new Date(specialty.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(specialty.updated_at).toLocaleDateString()} at {new Date(specialty.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Status</span>
                {specialty.is_active ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Availability</span>
                <span className={`text-sm font-medium ${
                  specialty.is_active ? 'text-green-600' : 'text-red-600'
                }`}>
                  {specialty.is_active ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Department Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department</h3>
            {department ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{department.name}</p>
                    <p className="text-sm text-gray-600">{department.description || 'No description'}</p>
                  </div>
                </div>
                <Link href={`/departments/${department.id}`}>
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View Department →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No department assigned</p>
              </div>
            )}
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Link href={`/specialties/${resolvedParams.id}/edit`}>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Edit size={16} />
                  Edit Specialty
                </button>
              </Link>
              <Link href="/specialties">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  <ArrowLeft size={16} />
                  Back to List
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
