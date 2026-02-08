'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Users, Filter, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import employeesData from '@/data/hr/employees.json';
import departmentsData from '@/data/hr/departments.json';

export default function EmployeeReportPage() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCharts, setShowCharts] = useState(true);

  const allEmployees = employeesData.employees;
  const departments = departmentsData.departments;

  const filtered = useMemo(() => {
    let emps = allEmployees;
    if (deptFilter !== 'all') emps = emps.filter(e => e.department_name === deptFilter);
    if (categoryFilter !== 'all') emps = emps.filter(e => e.employee_category === categoryFilter);
    if (statusFilter !== 'all') emps = emps.filter(e => e.employment_status === statusFilter);
    return emps;
  }, [allEmployees, deptFilter, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = filtered.filter(e => e.employment_status === 'ACTIVE').length;
    const onLeave = filtered.filter(e => e.employment_status === 'ON_LEAVE').length;
    const terminated = filtered.filter(e => e.employment_status === 'TERMINATED').length;
    const avgTenure = filtered.length > 0
      ? (filtered.reduce((s, e) => {
          const years = (new Date().getTime() - new Date(e.date_of_hire).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          return s + years;
        }, 0) / filtered.length).toFixed(1)
      : '0';
    return { total: filtered.length, active, onLeave, terminated, avgTenure };
  }, [filtered]);

  const byDepartment = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.department_name] = (map[e.department_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.employee_category] = (map[e.employee_category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const categoryColors: Record<string, string> = {
    MEDICAL_STAFF: '#3B82F6', NURSING: '#EC4899', ADMINISTRATIVE: '#6366F1', TECHNICAL: '#10B981', SUPPORT: '#F59E0B',
  };

  const maxDeptCount = byDepartment.length > 0 ? byDepartment[0][1] : 1;
  const maxCatCount = byCategory.length > 0 ? byCategory[0][1] : 1;

  const handleExport = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      alert('Generating PDF report... (simulated)');
    } else {
      const header = 'Employee Number,Name,Department,Category,Position,Hire Date,Status';
      const rows = filtered.map(e =>
        [e.employee_number, `${e.first_name} ${e.last_name}`, e.department_name, e.employee_category, e.job_title, e.date_of_hire, e.employment_status].join(',')
      );
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const deptNames = [...new Set(allEmployees.map(e => e.department_name))].sort();

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/reports"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Employee Report</h2>
            <p className="page-description">Comprehensive employee analytics and data export</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={() => handleExport('excel')}>
            <Download size={14} /> Excel
          </button>
          <button className="btn-primary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={() => handleExport('pdf')}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} style={{ color: '#525252' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="tibbna-input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {deptNames.map(d => (<option key={d} value={d}>{d}</option>))}
            </select>
            <select className="tibbna-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="MEDICAL_STAFF">Medical Staff</option>
              <option value="NURSING">Nursing</option>
              <option value="ADMINISTRATIVE">Administrative</option>
              <option value="TECHNICAL">Technical</option>
              <option value="SUPPORT">Support</option>
            </select>
            <select className="tibbna-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Employees</p><p className="tibbna-card-value">{stats.total}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Active</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.active}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">On Leave</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.onLeave}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Avg Tenure</p><p className="tibbna-card-value">{stats.avgTenure}</p><p className="tibbna-card-subtitle">years</p></div></div>
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 tibbna-section">
          {/* By Department Bar Chart */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><BarChart3 size={16} /> By Department</h3></div>
            <div className="tibbna-card-content">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={byDepartment.slice(0, 10).map(([dept, count]) => ({ name: dept.length > 12 ? dept.substring(0, 12) + '...' : dept, count }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#618FF5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><BarChart3 size={16} /> By Category</h3></div>
            <div className="tibbna-card-content">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory.map(([cat, count]) => ({ name: cat.replace(/_/g, ' '), value: count, fill: categoryColors[cat] || '#6B7280' }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {byCategory.map(([cat], i) => (<Cell key={i} fill={categoryColors[cat] || '#6B7280'} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Employees']} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <div className="flex items-center justify-between">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee Data ({filtered.length} records)</h3>
            <button className="btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => setShowCharts(!showCharts)}>
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
        </div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Emp #</th><th>Name</th><th>Department</th><th>Position</th><th>Category</th><th>Hire Date</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{e.employee_number}</td>
                    <td><Link href={`/hr/employees/${e.id}`} className="hover:underline" style={{ fontSize: '13px', fontWeight: 500 }}>{e.first_name} {e.last_name}</Link></td>
                    <td style={{ fontSize: '12px', color: '#525252' }}>{e.department_name}</td>
                    <td style={{ fontSize: '12px' }}>{e.job_title}</td>
                    <td><span className="tibbna-badge" style={{ backgroundColor: (categoryColors[e.employee_category] || '#6B7280') + '20', color: categoryColors[e.employee_category] || '#6B7280', fontSize: '10px' }}>{e.employee_category.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: '12px' }}>{e.date_of_hire}</td>
                    <td><span className="tibbna-badge" style={{ backgroundColor: e.employment_status === 'ACTIVE' ? '#D1FAE5' : e.employment_status === 'ON_LEAVE' ? '#FEF3C7' : '#FEE2E2', color: e.employment_status === 'ACTIVE' ? '#065F46' : e.employment_status === 'ON_LEAVE' ? '#92400E' : '#991B1B', fontSize: '10px' }}>{e.employment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {filtered.slice(0, 20).map(e => (
              <div key={e.id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{e.first_name} {e.last_name}</span>
                  <span className="tibbna-badge" style={{ backgroundColor: e.employment_status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7', color: e.employment_status === 'ACTIVE' ? '#065F46' : '#92400E', fontSize: '10px' }}>{e.employment_status}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.department_name} | {e.job_title} | {e.date_of_hire}</p>
              </div>
            ))}
            {filtered.length > 20 && <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' }}>+{filtered.length - 20} more</p>}
          </div>
        </div>
      </div>
    </>
  );
}
