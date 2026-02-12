'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Search, UserPlus, ChevronRight, Download, Trash2 } from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';
import departmentsData from '@/data/hr/departments.json';

const categoryColors: Record<string, { bg: string; text: string }> = {
  MEDICAL_STAFF: { bg: '#DBEAFE', text: '#1D4ED8' },
  NURSING: { bg: '#FCE7F3', text: '#BE185D' },
  ADMINISTRATIVE: { bg: '#E0E7FF', text: '#4338CA' },
  TECHNICAL: { bg: '#D1FAE5', text: '#065F46' },
  SUPPORT: { bg: '#FEF3C7', text: '#92400E' },
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
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // =========================================================================
  // LOAD DATA FROM DATASTORE
  // =========================================================================

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    try {
      const data = dataStore.getEmployees();
      setAllEmployees(data);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // FILTERING & SEARCH
  // =========================================================================

  const employees = useMemo(() => {
    return allEmployees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`;
      const matchesSearch = search === '' ||
        fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_number.toLowerCase().includes(search.toLowerCase()) ||
        emp.job_title.toLowerCase().includes(search.toLowerCase()) ||
        ((emp.email || (emp as any).email_work || '') as string).toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || emp.employee_category === categoryFilter;
      const matchesDept = departmentFilter === 'all' || emp.department_id === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
      return matchesSearch && matchesCategory && matchesDept && matchesStatus;
    });
  }, [allEmployees, search, categoryFilter, departmentFilter, statusFilter]);

  // =========================================================================
  // PAGINATION
  // =========================================================================

  const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return employees.slice(start, start + ITEMS_PER_PAGE);
  }, [employees, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, departmentFilter, statusFilter]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleDelete = (employeeId: string, employeeName: string) => {
    if (!hasRole('HR_ADMIN')) {
      toast.error('Only HR Admin can delete employees');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${employeeName}?`)) return;

    try {
      const success = dataStore.deleteEmployee(employeeId);
      if (success) {
        toast.success(`${employeeName} deleted successfully`);
        loadEmployees();
      } else {
        toast.error('Failed to delete employee');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error deleting employee');
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Position', 'Category', 'Status', 'Hire Date'];
      const rows = employees.map(emp => [
        emp.employee_number,
        `${emp.first_name} ${emp.last_name}`,
        emp.email || (emp as any).email_work || '',
        emp.department_name,
        emp.job_title,
        emp.employee_category,
        emp.employment_status,
        emp.date_of_hire,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Employees exported to CSV');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export employees');
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
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
          <p className="page-description">{employees.length} employees found</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <Link href="/hr/employees/new">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="tibbna-input pl-10"
                style={{ width: '100%' }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="tibbna-input"
            >
              <option value="all">All Categories</option>
              <option value="MEDICAL_STAFF">Medical Staff</option>
              <option value="NURSING">Nursing</option>
              <option value="ADMINISTRATIVE">Administrative</option>
              <option value="TECHNICAL">Technical</option>
              <option value="SUPPORT">Support</option>
            </select>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="tibbna-input"
            >
              <option value="all">All Departments</option>
              {departmentsData.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
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
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content text-center py-12">
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252' }}>No employees found</p>
            <p style={{ fontSize: '13px', color: '#a3a3a3', marginTop: '4px' }}>
              {search || categoryFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first employee'}
            </p>
            {(search || categoryFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setCategoryFilter('all'); setDepartmentFilter('all'); setStatusFilter('all'); }}
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
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(emp => {
                    const catColor = categoryColors[emp.employee_category] || { bg: '#F3F4F6', text: '#374151' };
                    const statColor = statusColors[emp.employment_status] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#618FF5' }}>
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 500 }}>{emp.first_name} {emp.last_name}</p>
                              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{emp.job_title}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#525252' }}>{emp.employee_number}</td>
                        <td style={{ fontSize: '13px' }}>{emp.department_name}</td>
                        <td>
                          <span className="tibbna-badge" style={{ backgroundColor: catColor.bg, color: catColor.text }}>
                            {emp.employee_category.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className="tibbna-badge" style={{ backgroundColor: statColor.bg, color: statColor.text }}>
                            {emp.employment_status}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#525252' }}>{emp.date_of_hire}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Link href={`/hr/employees/${emp.id}`}>
                              <button className="btn-secondary btn-sm">View</button>
                            </Link>
                            <Link href={`/hr/employees/${emp.id}/edit`}>
                              <button className="btn-secondary btn-sm">Edit</button>
                            </Link>
                            {hasRole('HR_ADMIN') && (
                              <button
                                onClick={() => handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)}
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
            {paginatedEmployees.map(emp => {
              const catColor = categoryColors[emp.employee_category] || { bg: '#F3F4F6', text: '#374151' };
              const statColor = statusColors[emp.employment_status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <Link key={emp.id} href={`/hr/employees/${emp.id}`}>
                  <div className="tibbna-card cursor-pointer active:bg-gray-50">
                    <div className="tibbna-card-content">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#618FF5' }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{emp.first_name} {emp.last_name}</p>
                            <p style={{ fontSize: '12px', color: '#525252' }}>{emp.job_title}</p>
                            <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{emp.department_name}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: '#a3a3a3' }} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="tibbna-badge" style={{ backgroundColor: catColor.bg, color: catColor.text, fontSize: '10px' }}>
                          {emp.employee_category.replace('_', ' ')}
                        </span>
                        <span className="tibbna-badge" style={{ backgroundColor: statColor.bg, color: statColor.text, fontSize: '10px' }}>
                          {emp.employment_status}
                        </span>
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
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, employees.length)} of {employees.length}
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
