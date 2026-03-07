'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye,
  Star,
  Users,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
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

export default function SpecialtiesPage() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  useEffect(() => {
    loadSpecialties();
  }, []);

  // Add a refresh mechanism when page gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSpecialties();
      }
    };

    const handleFocus = () => {
      loadSpecialties();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      // Add cache-busting timestamp
      const timestamp = Date.now();
      const response = await fetch(`/api/specialties?t=${timestamp}`);
      const data = await response.json();
      
      if (response.ok) {
        setSpecialties(data.data || []);
        console.log('Specialties loaded:', data.data?.length || 0, 'specialties');
        console.log('Specialty names:', data.data?.map((s: any) => s.name).join(', '));
      } else {
        console.error('Error loading specialties:', data.error);
        
        if (data.error?.includes('table not found')) {
          toast.error('Specialties table not found. Please set up the database first.');
        } else {
          toast.error(data.error || 'Failed to load specialties');
        }
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast.error('Failed to load specialties');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (specialtyId: string, specialtyName: string) => {
    if (!confirm(`Are you sure you want to delete the specialty "${specialtyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/specialties/${specialtyId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Specialty deleted successfully');
        loadSpecialties(); // Reload the list
      } else {
        if (result.staff_count > 0) {
          toast.error(`Cannot delete specialty. It is assigned to ${result.staff_count} staff members.`);
        } else {
          toast.error(result.error || 'Failed to delete specialty');
        }
      }
    } catch (error) {
      console.error('Error deleting specialty:', error);
      toast.error('Failed to delete specialty');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Description', 'Code', 'Status', 'Created At'],
      ...filteredSpecialties.map(specialty => [
        specialty.name,
        specialty.description || '',
        specialty.code,
        specialty.is_active ? 'Active' : 'Inactive',
        new Date(specialty.created_at).toLocaleDateString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'specialties.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSpecialties = specialties.filter(specialty => {
    const matchesSearch = specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         specialty.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         specialty.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && specialty.is_active) ||
                         (filterStatus === 'inactive' && !specialty.is_active);

    return matchesSearch && matchesFilter;
  });

  const toggleSpecialtySelection = (specialtyId: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(specialtyId) 
        ? prev.filter(id => id !== specialtyId)
        : [...prev, specialtyId]
    );
  };

  const toggleAllSelections = () => {
    if (selectedSpecialties.length === filteredSpecialties.length) {
      setSelectedSpecialties([]);
    } else {
      setSelectedSpecialties(filteredSpecialties.map(s => s.id));
    }
  };

  const setupDatabase = async () => {
    try {
      const response = await fetch('/api/setup-specialties', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Specialties table setup completed successfully');
        loadSpecialties();
      } else {
        toast.error(result.error || 'Failed to setup specialties table');
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      toast.error('Failed to setup specialties table');
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medical Specialties</h1>
            <p className="text-gray-600">Manage medical specialties and professional disciplines</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSpecialties}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              title="Refresh specialties list"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={setupDatabase}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Building2 size={16} />
              Setup Database
            </button>
            <Link href="/specialties/add">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                Add Specialty
              </button>
            </Link>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/departments" className="hover:text-gray-900">Departments</Link>
          <span>/</span>
          <span className="text-gray-900">Specialties</span>
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Specialties</p>
              <p className="text-2xl font-bold text-gray-900">{specialties.length}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {specialties.filter(s => s.is_active).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">
                {specialties.filter(s => !s.is_active).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quick Actions</p>
              <Link href="/specialties/tabs">
                <button className="text-sm text-blue-600 hover:text-blue-800">View Tabs →</button>
              </Link>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search specialties..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Specialties List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSpecialties.length === 0 ? (
          <div className="p-8 text-center">
            <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No specialties found</h3>
            <p className="text-gray-600 mb-4">
              {specialties.length === 0 
                ? 'Get started by adding your first medical specialty.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {specialties.length === 0 && (
              <div className="space-x-3">
                <button
                  onClick={setupDatabase}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Building2 size={16} />
                  Setup Database
                </button>
                <Link href="/specialties/add">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus size={16} />
                    Add Your First Specialty
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSpecialties.length === filteredSpecialties.length && filteredSpecialties.length > 0}
                      onChange={toggleAllSelections}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpecialties.map((specialty) => (
                  <tr key={specialty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSpecialties.includes(specialty.id)}
                        onChange={() => toggleSpecialtySelection(specialty.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="font-medium text-gray-900">{specialty.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {specialty.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {specialty.description || 'No description'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        specialty.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {specialty.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(specialty.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/specialties/${specialty.id}/view`}>
                          <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                            <Eye size={16} />
                          </button>
                        </Link>
                        <Link href={`/specialties/${specialty.id}/edit`}>
                          <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                            <Edit size={16} />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(specialty.id, specialty.name)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer with selection info */}
      {selectedSpecialties.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedSpecialties.length} specialty{selectedSpecialties.length > 1 ? 'ies' : ''} selected
            </span>
            <button
              onClick={() => setSelectedSpecialties([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
