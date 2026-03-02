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
  Settings,
  BarChart3,
  Database
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

interface Department {
  id: string;
  name: string;
  description?: string;
}

export default function SpecialtiesTabsPage() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'specialties' | 'departments' | 'analytics' | 'settings'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadSpecialties(),
      loadDepartments()
    ]);
  };

  const loadSpecialties = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

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
        loadSpecialties();
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

  const setupDatabase = async () => {
    try {
      const response = await fetch('/api/setup-specialties', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Specialties table setup completed successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to setup specialties table');
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      toast.error('Failed to setup specialties table');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'specialties', label: 'Specialties', icon: Star },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Specialties</p>
                    <p className="text-2xl font-bold text-gray-900">{specialties.length}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Specialties</p>
                    <p className="text-2xl font-bold text-green-600">
                      {specialties.filter(s => s.is_active).length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Departments</p>
                    <p className="text-2xl font-bold text-blue-600">{departments.length}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
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
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/departments/specialties/add">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus size={16} />
                    Add New Specialty
                  </button>
                </Link>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} />
                  Export Specialties
                </button>
                <button
                  onClick={setupDatabase}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Database size={16} />
                  Setup Database
                </button>
              </div>
            </div>

            {/* Recent Specialties */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Specialties</h3>
              <div className="space-y-3">
                {specialties.slice(0, 5).map((specialty) => (
                  <div key={specialty.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="font-medium text-gray-900">{specialty.name}</p>
                        <p className="text-sm text-gray-600">{specialty.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        specialty.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {specialty.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Link href={`/departments/specialties/${specialty.id}/edit`}>
                        <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                          <Edit size={16} />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'specialties':
        return (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
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

            {/* Specialties Table */}
            <div className="bg-white rounded-lg border border-gray-200">
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
                    <Link href="/departments/specialties/add">
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                        Add Your First Specialty
                      </button>
                    </Link>
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
                              <Link href={`/departments/specialties/${specialty.id}/view`}>
                                <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                                  <Eye size={16} />
                                </button>
                              </Link>
                              <Link href={`/departments/specialties/${specialty.id}/edit`}>
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
          </div>
        );

      case 'departments':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Departments Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium text-gray-900">{dept.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{dept.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {specialties.filter(s => s.department_id === dept.id).length} specialties
                      </span>
                      <Link href={`/departments/${dept.id}/edit`}>
                        <button className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Specialties by Department</h4>
                  <div className="space-y-2">
                    {departments.map((dept) => {
                      const count = specialties.filter(s => s.department_id === dept.id).length;
                      return (
                        <div key={dept.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{dept.name}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Status Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="text-sm font-medium text-green-600">
                        {specialties.filter(s => s.is_active).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Inactive</span>
                      <span className="text-sm font-medium text-red-600">
                        {specialties.filter(s => !s.is_active).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Setup Specialties Table</h4>
                    <p className="text-sm text-gray-600">Create the specialties table and populate with sample data</p>
                  </div>
                  <button
                    onClick={setupDatabase}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Setup Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
            <h1 className="text-2xl font-bold text-gray-900">Specialties Management</h1>
            <p className="text-gray-600">Manage medical specialties and professional disciplines</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <Link href="/departments/specialties/add">
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
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
