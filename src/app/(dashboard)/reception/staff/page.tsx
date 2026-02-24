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
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Get unique specialties and departments
  const occupations = Array.from(new Set(staff.map(s => s.specialty).filter(Boolean)));
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
      const response = await fetch('/api/ehrbase-doctors');
      if (response.ok) {
        const data = await response.json();
        // Transform the doctors data to match Staff interface
        const transformedStaff = data.doctors.map((doctor: any) => ({
          staffid: doctor.staffid || doctor.userid,
          name: doctor.name,
          occupation: doctor.role || 'doctor',
          unit: doctor.unit || doctor.unit,
          specialty: doctor.specialty || '',
          phone: doctor.phone || '',
          email: doctor.email || '',
          userid: doctor.userid,
          username: doctor.name,
          useremail: doctor.email,
          hasUserAccount: doctor.has_user_account
        }));
        setStaff(transformedStaff);
        setFilteredStaff(transformedStaff);
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
        s.specialty?.toLowerCase().includes(search) ||
        s.unit?.toLowerCase().includes(search)
      );
    }

    // Specialty filter
    if (occupationFilter !== 'all') {
      filtered = filtered.filter(s => s.specialty === occupationFilter);
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

  const handleStaffClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowStaffModal(true);
  };

  const closeStaffModal = () => {
    setShowStaffModal(false);
    setSelectedStaff(null);
  };

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
            {/* Specialty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty
              </label>
              <select
                value={occupationFilter}
                onChange={(e) => setOccupationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Specialties</option>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Specialty</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member, index) => (
                  <tr 
                    key={member.staffid} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleStaffClick(member)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {member.staffid.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                        {member.occupation || 'Not specified'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {member.unit || 'Not assigned'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {member.specialty || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {member.phone ? (
                        <a
                          href={`tel:${member.phone}`}
                          className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1"
                        >
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 truncate max-w-[200px]"
                        >
                          <Mail className="w-4 h-4" />
                          {member.email}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {member.userid ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Has Account
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          No Account
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                    <p className="text-blue-100">
                      {selectedStaff.occupation || 'Staff Member'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeStaffModal}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm">
                      {selectedStaff.staffid}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm">
                      {selectedStaff.userid || 'Not assigned'}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                    <div className="flex items-center gap-2">
                      {selectedStaff.userid ? (
                        <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
                          <UserCheck className="w-4 h-4 mr-1" />
                          Has User Account
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
                          <User className="w-4 h-4 mr-1" />
                          No User Account
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role/Occupation</label>
                    <div className="bg-purple-50 px-3 py-2 rounded-lg">
                      <span className="text-purple-700 font-medium capitalize">
                        {selectedStaff.occupation || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <div className="bg-green-50 px-3 py-2 rounded-lg">
                      <span className="text-green-700 font-medium">
                        {selectedStaff.unit || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <div className="bg-indigo-50 px-3 py-2 rounded-lg">
                      <span className="text-indigo-700 font-medium">
                        {selectedStaff.specialty || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                      {selectedStaff.phone ? (
                        <a
                          href={`tel:${selectedStaff.phone}`}
                          className="text-blue-700 hover:text-blue-900 flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          {selectedStaff.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                      {selectedStaff.email ? (
                        <a
                          href={`mailto:${selectedStaff.email}`}
                          className="text-blue-700 hover:text-blue-900 flex items-center gap-2 truncate"
                        >
                          <Mail className="w-4 h-4" />
                          {selectedStaff.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                      {selectedStaff.username || 'Not available'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                      {selectedStaff.useremail || 'Not available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-6 flex justify-end gap-3">
                <button
                  onClick={closeStaffModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
