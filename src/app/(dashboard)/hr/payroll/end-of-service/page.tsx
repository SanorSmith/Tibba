'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Calculator, Users } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';

export default function EndOfServicePage() {
  const [deptFilter, setDeptFilter] = useState('all');

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const departments = [...new Set(activeEmployees.map(e => e.department_name))].sort();

  const provisions = useMemo(() => {
    let emps = activeEmployees;
    if (deptFilter !== 'all') emps = emps.filter(e => e.department_name === deptFilter);

    return emps.map(emp => {
      const hireDate = new Date(emp.date_of_hire);
      const now = new Date();
      const yearsOfService = Math.max(0, (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const basic = emp.basic_salary || 1000000;
      const dailySalary = basic / 30;

      let provision = 0;
      if (yearsOfService <= 5) {
        provision = Math.round(yearsOfService * 15 * dailySalary);
      } else if (yearsOfService <= 10) {
        provision = Math.round(5 * 15 * dailySalary + (yearsOfService - 5) * 30 * dailySalary);
      } else {
        provision = Math.round(5 * 15 * dailySalary + 5 * 30 * dailySalary + (yearsOfService - 10) * 45 * dailySalary);
      }

      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_number: emp.employee_number,
        department: emp.department_name,
        date_of_hire: emp.date_of_hire,
        years_of_service: Math.round(yearsOfService * 10) / 10,
        basic_salary: basic,
        provision_amount: provision,
      };
    }).sort((a, b) => b.provision_amount - a.provision_amount);
  }, [activeEmployees, deptFilter]);

  const totalProvision = provisions.reduce((s, p) => s + p.provision_amount, 0);
  const avgYears = provisions.length > 0 ? (provisions.reduce((s, p) => s + p.years_of_service, 0) / provisions.length).toFixed(1) : '0';

  const handleExport = () => {
    const header = 'Employee Number,Employee Name,Department,Hire Date,Years of Service,Basic Salary,EOS Provision';
    const rows = provisions.map(p =>
      [p.employee_number, p.employee_name, p.department, p.date_of_hire, p.years_of_service, p.basic_salary, p.provision_amount].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'end-of-service-provisions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">End of Service Provision</h2>
            <p className="page-description">Iraqi Labor Law - End of service benefit calculations</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleExport}>
          <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Formula */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Calculator size={16} /> Iraqi Labor Law Formula</h3></div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p style={{ fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>First 5 Years</p>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>15 days</p>
              <p style={{ color: '#525252' }}>salary per year of service</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p style={{ fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>5-10 Years</p>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>1 month</p>
              <p style={{ color: '#525252' }}>salary per year of service</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p style={{ fontWeight: 600, color: '#065F46', marginBottom: '4px' }}>10+ Years</p>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>1.5 months</p>
              <p style={{ color: '#525252' }}>salary per year of service</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employees</p><p className="tibbna-card-value">{provisions.length}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Avg Service</p><p className="tibbna-card-value">{avgYears}</p><p className="tibbna-card-subtitle">years</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Provision</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(totalProvision / 1000000000).toFixed(2)}B</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Avg Provision</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{provisions.length > 0 ? (totalProvision / provisions.length / 1000000).toFixed(1) : 0}M</p><p className="tibbna-card-subtitle">IQD/employee</p></div></div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 tibbna-section">
        <select className="tibbna-input" style={{ width: 'auto' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => (<option key={d} value={d}>{d}</option>))}
        </select>
      </div>

      {/* Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Hire Date</th><th>Years</th><th>Basic Salary</th><th>EOS Provision</th></tr></thead>
              <tbody>
                {provisions.map(p => (
                  <tr key={p.employee_id}>
                    <td><p style={{ fontSize: '13px', fontWeight: 500 }}>{p.employee_name}</p><p style={{ fontSize: '10px', color: '#a3a3a3' }}>{p.employee_number}</p></td>
                    <td style={{ fontSize: '12px', color: '#525252' }}>{p.department}</td>
                    <td style={{ fontSize: '13px' }}>{p.date_of_hire}</td>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{p.years_of_service}</td>
                    <td style={{ fontSize: '13px' }}>{(p.basic_salary / 1000000).toFixed(1)}M</td>
                    <td style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>{(p.provision_amount / 1000000).toFixed(2)}M</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 700 }}>
                  <td colSpan={4}>TOTAL</td>
                  <td></td>
                  <td style={{ color: '#EF4444' }}>{(totalProvision / 1000000000).toFixed(3)}B IQD</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {provisions.slice(0, 15).map(p => (
              <div key={p.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{p.employee_name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>{(p.provision_amount / 1000000).toFixed(1)}M</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{p.department} | {p.years_of_service} years | Hired: {p.date_of_hire}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
