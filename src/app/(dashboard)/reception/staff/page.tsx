'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-react';

interface Staff {
  staffid: string;
  name: string;
  occupation: string;
  unit: string;
  specialty?: string;
  phone: string;
  email: string;
  userid?: string;
  username?: string;
  useremail?: string;
}

export default function StaffInfoPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique occupations and departments
  const occupations = Array.from(new Set(staff.map(s => s.occupation).filter(Boolean)));
  const departments = Array.from(new Set(staff.map(s => s.unit).filter(Boolean)));

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [searchTerm, occupationFilter, departmentFilter, staff]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
        setFilteredStaff(data.staff || []);
      } else {
        console.error('Failed to load staff');
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search) ||
        s.phone?.toLowerCase().includes(search) ||
        s.occupation?.toLowerCase().includes(search) ||
        s.unit?.toLowerCase().includes(search)
      );
    }

    // Occupation filter
    if (occupationFilter !== 'all') {
      filtered = filtered.filter(s => s.occupation === occupationFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(s => s.unit === departmentFilter);
    }

    setFilteredStaff(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOccupationFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters = searchTerm || occupationFilter !== 'all' || departmentFilter !== 'all';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Information</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and view all medical staff members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <div>
                <div className="text-xs opacity-90">Total Staff</div>
                <div className="text-xl font-bold">{staff.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, occupation, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Clear</span>
            </button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Occupation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occupation
              </label>
              <select
                value={occupationFilter}
                onChange={(e) => setOccupationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Occupations</option>
                {occupations.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredStaff.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{staff.length}</span> staff members
        </p>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading staff...</p>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff found</h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters or search term'
              : 'No staff members in the database'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div
              key={member.staffid}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Card Header with Gradient */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {member.userid ? (
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <UserCheck className="w-3 h-3 text-white" />
                          <span className="text-xs text-white font-medium">Has Account</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <User className="w-3 h-3 text-white/70" />
                          <span className="text-xs text-white/70">No Account</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Occupation */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Occupation</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {member.occupation || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {member.unit || 'Not assigned'}
                    </p>
                  </div>
                </div>

                {/* Specialty */}
                {member.specialty && member.specialty !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Specialty</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {member.specialty}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  {/* Email */}
                  {member.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                      >
                        {member.email}
                      </a>
                    </div>
                  )}

                  {/* Phone */}
                  {member.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-orange-600" />
                      </div>
                      <a
                        href={`tel:${member.phone}`}
                        className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                      >
                        {member.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Staff ID */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Staff ID: <span className="font-mono text-gray-600">{member.staffid}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
