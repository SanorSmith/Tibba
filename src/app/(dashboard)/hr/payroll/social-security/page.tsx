'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Download, Users, DollarSign } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import payrollData from '@/data/hr/payroll.json';

const SS_EMPLOYEE_RATE = 0.05;
const SS_EMPLOYER_RATE = 0.12;

export default function SocialSecurityPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(payrollData.payroll_periods[payrollData.payroll_periods.length - 1].id);
  const [deptFilter, setDeptFilter] = useState('all');

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const departments = [...new Set(activeEmployees.map(e => e.department_name))].sort();

  const contributions = useMemo(() => {
    let emps = activeEmployees;
    if (deptFilter !== 'all') emps = emps.filter(e => e.department_name === deptFilter);
    return emps.map(emp => {
      const basic = emp.basic_salary || 1000000;
      const empContrib = Math.round(basic * SS_EMPLOYEE_RATE);
      const erContrib = Math.round(basic * SS_EMPLOYER_RATE);
      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_number: emp.employee_number,
        department: emp.department_name,
        basic_salary: basic,
        employee_contribution: empContrib,
        employer_contribution: erContrib,
        total_contribution: empContrib + erContrib,
      };
    });
  }, [activeEmployees, deptFilter]);

  const totals = useMemo(() => ({
    employees: contributions.length,
    totalBasic: contributions.reduce((s, c) => s + c.basic_salary, 0),
    totalEmployee: contributions.reduce((s, c) => s + c.employee_contribution, 0),
    totalEmployer: contributions.reduce((s, c) => s + c.employer_contribution, 0),
    totalAll: contributions.reduce((s, c) => s + c.total_contribution, 0),
  }), [contributions]);

  const handleExport = () => {
    const header = 'Employee Number,Employee Name,Department,Basic Salary,Employee Contribution (5%),Employer Contribution (12%),Total';
    const rows = contributions.map(c =>
      [c.employee_number, c.employee_name, c.department, c.basic_salary, c.employee_contribution, c.employer_contribution, c.total_contribution].join(',')
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-security-contributions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => `${(n / 1000000).toFixed(2)}M`;

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Social Security Contributions</h2>
            <p className="page-description">Iraqi Social Security Law - Employee & Employer contributions</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleExport}>
          <Download size={16} /><span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Rules */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Shield size={16} /> Contribution Rules</h3></div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p style={{ fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>Employee Contribution</p>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>5%</p>
              <p style={{ color: '#525252' }}>of basic salary, deducted monthly from payroll</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p style={{ fontWeight: 600, color: '#065F46', marginBottom: '4px' }}>Employer Contribution</p>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>12%</p>
              <p style={{ color: '#525252' }}>of basic salary, paid by hospital to SS authority</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employees</p><p className="tibbna-card-value">{totals.employees}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employee Total</p><p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{fmt(totals.totalEmployee)}</p><p className="tibbna-card-subtitle">IQD/month</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employer Total</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{fmt(totals.totalEmployer)}</p><p className="tibbna-card-subtitle">IQD/month</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Combined Total</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{fmt(totals.totalAll)}</p><p className="tibbna-card-subtitle">IQD/month</p></div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 tibbna-section flex-wrap">
        <select className="tibbna-input" style={{ width: 'auto' }} value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
          {payrollData.payroll_periods.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
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
              <thead><tr><th>Employee</th><th>Department</th><th>Basic Salary</th><th>Employee (5%)</th><th>Employer (12%)</th><th>Total</th></tr></thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.employee_id}>
                    <td><p style={{ fontSize: '13px', fontWeight: 500 }}>{c.employee_name}</p><p style={{ fontSize: '10px', color: '#a3a3a3' }}>{c.employee_number}</p></td>
                    <td style={{ fontSize: '12px', color: '#525252' }}>{c.department}</td>
                    <td style={{ fontSize: '13px' }}>{(c.basic_salary / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', color: '#3B82F6' }}>{(c.employee_contribution / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', color: '#10B981' }}>{(c.employer_contribution / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{(c.total_contribution / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 700 }}>
                  <td colSpan={2}>TOTAL</td>
                  <td>{(totals.totalBasic / 1000000).toFixed(1)}M</td>
                  <td style={{ color: '#3B82F6' }}>{(totals.totalEmployee / 1000000).toFixed(2)}M</td>
                  <td style={{ color: '#10B981' }}>{(totals.totalEmployer / 1000000).toFixed(2)}M</td>
                  <td style={{ color: '#6366F1' }}>{(totals.totalAll / 1000000).toFixed(2)}M</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {contributions.slice(0, 15).map(c => (
              <div key={c.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{c.employee_name}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.department}</p>
                <div className="grid grid-cols-3 gap-2 mt-1" style={{ fontSize: '12px' }}>
                  <div><span style={{ color: '#a3a3a3' }}>Emp</span><p style={{ color: '#3B82F6' }}>{(c.employee_contribution / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Er</span><p style={{ color: '#10B981' }}>{(c.employer_contribution / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Total</span><p style={{ fontWeight: 600 }}>{(c.total_contribution / 1000).toFixed(0)}K</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
