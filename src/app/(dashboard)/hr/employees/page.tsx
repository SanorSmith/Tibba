'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Download, Trash2, Eye, Edit } from 'lucide-react';
import { getEmployees, deleteEmployee } from '@/lib/actions/employees';
import { toast } from 'sonner';

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  ON_LEAVE: { bg: '#FEF3C7', text: '#92400E' },
  TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
  SUSPENDED: { bg: '#FEE2E2', text: '#991B1B' },
};

const ITEMS_PER_PAGE = 10;

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    const result = await getEmployees();

    if (result.success) {
      setEmployees(result.data || []);
    } else {
      toast.error(result.error || 'Failed to load employees');
    }

    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    const result = await deleteEmployee(id);

    if (result.success) {
      toast.success('Employee deleted successfully');
      loadEmployees();
    } else {
      toast.error(result.error || 'Failed to delete employee');
    }
  }

  // Get unique departments from loaded data
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department?.name).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filtered data
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        !search ||
        emp.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase());

      const matchesDepartment =
        departmentFilter === 'all' || emp.department?.name === departmentFilter;

      const matchesStatus =
        statusFilter === 'all' || emp.employment_status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.employment_status === 'ACTIVE').length,
    onLeave: employees.filter(e => e.employment_status === 'ON_LEAVE').length,
    inactive: employees.filter(e => e.employment_status !== 'ACTIVE' && e.employment_status !== 'ON_LEAVE').length
  }), [employees]);

  // Export CSV
  function handleExportCSV() {
    const headers = ['Employee #', 'Name', 'Email', 'Department', 'Job Title', 'Status'];
    const rows = filteredEmployees.map(emp => [
      emp.employee_number,
      `${emp.first_name} ${emp.last_name}`,
      emp.email || '',
      emp.department?.name || '',
      emp.job_title || '',
      emp.employment_status
    ]);

    const csv = [headers, ...rows].map(row => row.map((c: string) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Employees exported to CSV');
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
          <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Employee Directory</h2>
          <p className="page-description">{filteredEmployees.length} employees found</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => router.push('/hr/employees/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="tibbna-grid-4 mb-6">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Total Employees</p>
            <p className="text-2xl font-bold" style={{ color: '#111827' }}>{stats.total}</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Active</p>
            <p className="text-2xl font-bold" style={{ color: '#059669' }}>{stats.active}</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>On Leave</p>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{stats.onLeave}</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Inactive</p>
            <p className="text-2xl font-bold" style={{ color: '#6B7280' }}>{stats.inactive}</p>
          </div>
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
                placeholder="Search by name, email, or employee number..."
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
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="tibbna-input"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content text-center py-12">
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252' }}>No employees found</p>
            <p style={{ fontSize: '13px', color: '#a3a3a3', marginTop: '4px' }}>
              {search || departmentFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first employee'}
            </p>
            {(search || departmentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setDepartmentFilter('all'); setStatusFilter('all'); }}
                className="btn-secondary mt-4"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-card-header flex items-center justify-between">
              <h3 className="tibbna-card-title">
                Employee List ({filteredEmployees.length})
              </h3>
            </div>
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Employee #</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Job Title</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(emp => {
                    const statColor = statusColors[emp.employment_status] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr key={emp.id}>
                        <td className="font-medium" style={{ color: '#111827' }}>
                          {emp.employee_number}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#618FF5' }}>
                              {(emp.first_name || '?')[0]}{(emp.last_name || '?')[0]}
                            </div>
                            <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#6B7280' }}>{emp.email || '-'}</td>
                        <td>{emp.department?.name || '-'}</td>
                        <td style={{ color: '#6B7280' }}>{emp.job_title || '-'}</td>
                        <td>
                          <span className="tibbna-badge" style={{ backgroundColor: statColor.bg, color: statColor.text }}>
                            {emp.employment_status || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/hr/employees/${emp.id}`)}
                              className="p-2 rounded hover:bg-gray-100"
                              title="View"
                            >
                              <Eye size={16} style={{ color: '#6B7280' }} />
                            </button>
                            <button
                              onClick={() => router.push(`/hr/employees/${emp.id}/edit`)}
                              className="p-2 rounded hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit size={16} style={{ color: '#2563EB' }} />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-2 rounded hover:bg-gray-100"
                              title="Delete"
                            >
                              <Trash2 size={16} style={{ color: '#DC2626' }} />
                            </button>
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
            {paginatedEmployees.map(emp => {
              const statColor = statusColors[emp.employment_status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <div key={emp.id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#618FF5' }}>
                          {(emp.first_name || '?')[0]}{(emp.last_name || '?')[0]}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>{emp.first_name} {emp.last_name}</p>
                          <p style={{ fontSize: '12px', color: '#525252' }}>{emp.employee_number}</p>
                        </div>
                      </div>
                      <span className="tibbna-badge" style={{ backgroundColor: statColor.bg, color: statColor.text, fontSize: '10px' }}>
                        {emp.employment_status || '-'}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Department:</span>
                        <span style={{ color: '#111827' }}>{emp.department?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Job Title:</span>
                        <span style={{ color: '#111827' }}>{emp.job_title || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#6B7280' }}>Email:</span>
                        <span style={{ color: '#111827' }}>{emp.email || '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/hr/employees/${emp.id}`)}
                        className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/hr/employees/${emp.id}/edit`)}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="tibbna-card tibbna-section">
              <div className="tibbna-card-content flex flex-col sm:flex-row items-center justify-between gap-3">
                <p style={{ fontSize: '13px', color: '#525252' }}>
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary btn-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
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
