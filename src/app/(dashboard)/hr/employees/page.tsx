'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, UserPlus, ChevronRight, Download, Trash2, Mail, Phone, MapPin, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Staff {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  role: string;
  unit: string | null;
  specialty: string | null;
  phone: string;
  email: string;
  dateOfBirth: string | null;
  customStaffId: string | null;
  createdAt: string;
  updatedAt: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  MEDICAL_STAFF: { bg: '#DBEAFE', text: '#1D4ED8' },
  NURSING: { bg: '#FCE7F3', text: '#BE185D' },
  ADMINISTRATIVE: { bg: '#E0E7FF', text: '#4338CA' },
  TECHNICAL: { bg: '#D1FAE5', text: '#065F46' },
  SUPPORT: { bg: '#FEF3C7', text: '#92400E' },
  DOCTOR: { bg: '#DBEAFE', text: '#1D4ED8' },
  NURSE: { bg: '#FCE7F3', text: '#BE185D' },
  STAFF: { bg: '#E0E7FF', text: '#4338CA' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  ON_LEAVE: { bg: '#FEF3C7', text: '#92400E' },
  TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
  SUSPENDED: { bg: '#FEE2E2', text: '#991B1B' },
};

const ITEMS_PER_PAGE = 10;

export default function EmployeesPage() {
  const { hasRole } = useAuth();
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [occupationFilter, setOccupationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // =========================================================================
  // LOAD DATA FROM DATABASE
  // =========================================================================

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const response = await fetch(`/api/staff?t=${timestamp}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Staff loaded:', data.staff?.length || 0, 'members');
        if (data.staff && data.staff.length > 0) {
          console.log('Sample staff data:', {
            firstName: data.staff[0].firstName,
            lastName: data.staff[0].lastName,
            email: data.staff[0].email
          });
        }
        setAllStaff(data.staff || []);
      } else {
        console.error('❌ Error loading staff:', data.error);
        toast.error('Failed to load staff from database');
      }
    } catch (error) {
      console.error('❌ Error loading staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // FILTERING & SEARCH
  // =========================================================================

  const staff = useMemo(() => {
    return allStaff.filter(person => {
      const matchesSearch = search === '' ||
        person.firstName.toLowerCase().includes(search.toLowerCase()) ||
        person.lastName.toLowerCase().includes(search.toLowerCase()) ||
        person.email.toLowerCase().includes(search.toLowerCase()) ||
        person.phone.toLowerCase().includes(search.toLowerCase()) ||
        person.role.toLowerCase().includes(search.toLowerCase()) ||
        (person.unit && person.unit.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = departmentFilter === 'all' || (person.unit && person.unit === departmentFilter);
      const matchesOccupation = occupationFilter === 'all' || (person.specialty && person.specialty === occupationFilter);
      return matchesSearch && matchesDept && matchesOccupation;
    });
  }, [allStaff, search, departmentFilter, occupationFilter]);

  // =========================================================================
  // PAGINATION
  // =========================================================================

  const totalPages = Math.ceil(staff.length / ITEMS_PER_PAGE);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return staff.slice(start, start + ITEMS_PER_PAGE);
  }, [staff, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, occupationFilter]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!hasRole('HR_ADMIN')) {
      toast.error('Only HR Admin can delete staff');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${staffName}?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/staff?staffId=${staffId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Staff member deleted successfully:', result);
        toast.success('Staff member deleted successfully');
        // Reload staff list
        await loadStaff();
      } else {
        console.error('Error deleting staff member:', result);
        toast.error(result.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Failed to delete staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Staff ID', 'Name', 'Email', 'Phone', 'Department', 'Role', 'Specialty', 'Created Date'];
      const rows = staff.map(person => [
        person.id,
        `${person.firstName} ${person.lastName}`,
        person.email,
        person.phone,
        person.unit || '',
        person.role,
        person.specialty || '',
        new Date(person.createdAt).toLocaleDateString(),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Staff exported to CSV');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export staff');
    }
  };

  // Get unique departments and occupations for filters
  const departments = useMemo(() => {
    const depts = [...new Set(allStaff.map(person => person.unit).filter(Boolean))];
    return depts.sort();
  }, [allStaff]);

  const occupations = useMemo(() => {
    const occs = [...new Set(allStaff.map(person => person.specialty).filter(Boolean))];
    return occs.sort();
  }, [allStaff]);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
          <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Staff Directory</h2>
          <p className="page-description">{staff.length} staff members found</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <Link href="/hr/employees/add">
            <button className="btn-primary flex items-center gap-2">
              <UserPlus size={16} />
              <span className="hidden sm:inline">Add Employee</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="tibbna-input pl-10"
                style={{ width: '100%' }}
              />
            </div>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="tibbna-input"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept || ''}>{dept}</option>
              ))}
            </select>
            <select
              value={occupationFilter}
              onChange={e => setOccupationFilter(e.target.value)}
              className="tibbna-input"
            >
              <option value="all">All Occupations</option>
              {occupations.map(occ => (
                <option key={occ} value={occ || ''}>{occ}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content text-center py-12">
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252' }}>No staff found</p>
            <p style={{ fontSize: '13px', color: '#a3a3a3', marginTop: '4px' }}>
              {search || departmentFilter !== 'all' || occupationFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'The staff table needs to be set up first'}
            </p>
            {(search || departmentFilter !== 'all' || occupationFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setDepartmentFilter('all'); setOccupationFilter('all'); }}
                className="btn-secondary mt-4"
              >
                Clear Filters
              </button>
            )}
            {!search && departmentFilter === 'all' && occupationFilter === 'all' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="text-blue-600" size={20} />
                    <h4 className="text-blue-900 font-semibold">Staff Table Setup Required</h4>
                  </div>
                  <p className="text-blue-700 text-sm mb-4">
                    The staff table doesn't exist in the database yet. You need to set it up first before adding employees.
                  </p>
                  <Link href="/hr/setup-staff">
                    <button className="btn-primary">
                      <Database size={16} className="mr-2" />
                      Setup Staff Table
                    </button>
                  </Link>
                </div>
                <Link href="/hr/employees/add">
                  <button className="btn-secondary">
                    <UserPlus size={16} className="mr-2" />
                    Add Employee (After Setup)
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Date of Birth</th>
                    <th>Contact</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Staff ID</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStaff.map(person => {
                    const fullName = `${person.firstName} ${person.lastName}`;
                    const deptColor = categoryColors[person.unit || ''] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr key={person.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#618FF5' }}>
                              {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 500 }}>{fullName}</p>
                              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{person.specialty || 'No specialty'}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#525252' }}>
                          {person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString() : 'Not set'}
                        </td>
                        <td>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1" style={{ fontSize: '13px', color: '#525252' }}>
                              <Mail size={12} style={{ color: '#a3a3a3' }} />
                              {person.email}
                            </div>
                            <div className="flex items-center gap-1" style={{ fontSize: '13px', color: '#525252' }}>
                              <Phone size={12} style={{ color: '#a3a3a3' }} />
                              {person.phone}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="tibbna-badge" style={{ backgroundColor: deptColor.bg, color: deptColor.text }}>
                            {person.unit || 'General'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{person.role}</td>
                        <td style={{ fontSize: '13px', color: '#525252' }}>
  {person.customStaffId || person.id}
</td>
                        <td style={{ fontSize: '13px', color: '#525252' }}>
                          {new Date(person.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link href={`/hr/employees/${person.id}`}>
                              <button className="btn-secondary btn-sm">View</button>
                            </Link>
                            {hasRole('HR_ADMIN') && (
                              <button
                                onClick={() => handleDelete(person.id, `${person.firstName} ${person.lastName}`)}
                                className="btn-sm flex items-center justify-center"
                                style={{ color: '#EF4444', padding: '4px 8px', borderRadius: '6px', border: '1px solid #FCA5A5' }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {paginatedStaff.map(person => {
              const fullName = `${person.firstName} ${person.lastName}`;
              const deptColor = categoryColors[person.unit || ''] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <Link key={person.id} href={`/hr/employees/${person.id}`}>
                  <div className="tibbna-card cursor-pointer active:bg-gray-50">
                    <div className="tibbna-card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#618FF5' }}>
                            {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{fullName}</p>
                            <p style={{ fontSize: '12px', color: '#525252' }}>{person.role}</p>
                            <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{person.unit}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: '#a3a3a3' }} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="tibbna-badge" style={{ backgroundColor: deptColor.bg, color: deptColor.text, fontSize: '10px' }}>
                          {person.unit || 'General'}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1" style={{ fontSize: '12px', color: '#525252' }}>
                          <Mail size={10} style={{ color: '#a3a3a3' }} />
                          {person.email}
                        </div>
                        <div className="flex items-center gap-1" style={{ fontSize: '12px', color: '#525252' }}>
                          <Phone size={10} style={{ color: '#a3a3a3' }} />
                          {person.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="tibbna-card tibbna-section">
              <div className="tibbna-card-content flex flex-col sm:flex-row items-center justify-between gap-3">
                <p style={{ fontSize: '13px', color: '#525252' }}>
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, staff.length)} of {staff.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev !== undefined && page - prev > 1;
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span style={{ padding: '0 4px', color: '#a3a3a3' }}>...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className="btn-sm"
                            style={{
                              minWidth: '32px',
                              borderRadius: '6px',
                              border: currentPage === page ? 'none' : '1px solid #e4e4e4',
                              backgroundColor: currentPage === page ? '#618FF5' : 'white',
                              color: currentPage === page ? 'white' : '#525252',
                              fontWeight: currentPage === page ? 600 : 400,
                            }}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
