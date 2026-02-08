'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Search, Filter, UserPlus, Mail, Phone, ChevronRight } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
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

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const employees = employeesData.employees.filter(emp => {
    const matchesSearch = search === '' ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(search.toLowerCase()) ||
      emp.job_title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || emp.employee_category === categoryFilter;
    const matchesDept = departmentFilter === 'all' || emp.department_id === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
    return matchesSearch && matchesCategory && matchesDept && matchesStatus;
  });

  const uniqueDepts = [...new Set(employeesData.employees.map(e => e.department_id))];

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Employee Directory</h2>
          <p className="page-description">{employees.length} employees found</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          <span className="hidden sm:inline">Add Employee</span>
        </button>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
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
                      <Link href={`/hr/employees/${emp.id}`}>
                        <button className="btn-secondary btn-sm">View</button>
                      </Link>
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
        {employees.map(emp => {
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
    </>
  );
}
