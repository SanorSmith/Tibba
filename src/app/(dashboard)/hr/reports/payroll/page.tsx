'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Filter, BarChart3, DollarSign } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import payrollData from '@/data/hr/payroll.json';

export default function PayrollReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(payrollData.payroll_periods[payrollData.payroll_periods.length - 1].id);
  const [deptFilter, setDeptFilter] = useState('all');
  const [showCharts, setShowCharts] = useState(true);

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const period = payrollData.payroll_periods.find(p => p.id === selectedPeriod)!;
  const deptNames = [...new Set(activeEmployees.map(e => e.department_name))].sort();

  const payrollCalc = useMemo(() => {
    let emps = activeEmployees;
    if (deptFilter !== 'all') emps = emps.filter(e => e.department_name === deptFilter);

    return emps.map(emp => {
      const basic = emp.basic_salary || 1000000;
      const housing = Math.round(basic * 0.20);
      const transport = 150000;
      const meal = 100000;
      const overtime = 0;
      const gross = basic + housing + transport + meal + overtime;
      const ssEmployee = Math.round(basic * 0.05);
      const incomeTax = Math.round(gross * 0.03);
      const loanRepayment = 0;
      const totalDeductions = ssEmployee + incomeTax + loanRepayment;
      const net = gross - totalDeductions;

      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_number: emp.employee_number,
        department: emp.department_name,
        grade: emp.grade_id || '-',
        basic, housing, transport, meal, overtime, gross,
        ss_employee: ssEmployee, income_tax: incomeTax, loan_repayment: loanRepayment,
        total_deductions: totalDeductions, net,
      };
    });
  }, [activeEmployees, deptFilter]);

  const totals = useMemo(() => ({
    employees: payrollCalc.length,
    gross: payrollCalc.reduce((s, p) => s + p.gross, 0),
    deductions: payrollCalc.reduce((s, p) => s + p.total_deductions, 0),
    net: payrollCalc.reduce((s, p) => s + p.net, 0),
    ss: payrollCalc.reduce((s, p) => s + p.ss_employee, 0),
    tax: payrollCalc.reduce((s, p) => s + p.income_tax, 0),
    loans: payrollCalc.reduce((s, p) => s + p.loan_repayment, 0),
  }), [payrollCalc]);

  const byDepartment = useMemo(() => {
    const map: Record<string, { gross: number; net: number; count: number }> = {};
    payrollCalc.forEach(p => {
      if (!map[p.department]) map[p.department] = { gross: 0, net: 0, count: 0 };
      map[p.department].gross += p.gross;
      map[p.department].net += p.net;
      map[p.department].count++;
    });
    return Object.entries(map)
      .map(([dept, data]) => ({ dept, ...data }))
      .sort((a, b) => b.gross - a.gross);
  }, [payrollCalc]);

  const maxDeptGross = byDepartment.length > 0 ? byDepartment[0].gross : 1;

  const deductionBreakdown = [
    { label: 'Social Security (5%)', value: totals.ss, color: '#3B82F6' },
    { label: 'Income Tax (3%)', value: totals.tax, color: '#F59E0B' },
    { label: 'Loan Repayments', value: totals.loans, color: '#EF4444' },
  ];
  const maxDeduction = Math.max(...deductionBreakdown.map(d => d.value), 1);

  const fmt = (n: number) => `${(n / 1000000).toFixed(2)}M`;

  const handleExport = () => {
    const header = 'Employee Number,Name,Department,Grade,Basic,Housing,Transport,Meal,Overtime,Gross,SS,Tax,Loans,Deductions,Net';
    const rows = payrollCalc.map(p =>
      [p.employee_number, p.employee_name, p.department, p.grade, p.basic, p.housing, p.transport, p.meal, p.overtime, p.gross, p.ss_employee, p.income_tax, p.loan_repayment, p.total_deductions, p.net].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${period.name.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/reports"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Payroll Report</h2>
            <p className="page-description">Payroll analytics, cost breakdown, and data export</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={handleExport}>
            <Download size={14} /> Excel
          </button>
          <button className="btn-primary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={() => alert('Generating PDF... (simulated)')}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center gap-2 mb-3"><Filter size={14} style={{ color: '#525252' }} /><span style={{ fontSize: '13px', fontWeight: 600 }}>Filters</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="tibbna-input" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
              {payrollData.payroll_periods.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <select className="tibbna-input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {deptNames.map(d => (<option key={d} value={d}>{d}</option>))}
            </select>
            <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setShowCharts(!showCharts)}>
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Gross</p><p className="tibbna-card-value">{fmt(totals.gross)}</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Deductions</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{fmt(totals.deductions)}</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Net</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{fmt(totals.net)}</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employees Paid</p><p className="tibbna-card-value">{totals.employees}</p></div></div>
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 tibbna-section">
          {/* Department Cost */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><BarChart3 size={16} /> Payroll by Department</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {byDepartment.slice(0, 10).map(d => (
                <div key={d.dept} className="flex items-center gap-2">
                  <span style={{ fontSize: '11px', color: '#525252', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{d.dept}</span>
                  <div className="flex-1" style={{ height: '18px', backgroundColor: '#f3f4f6' }}>
                    <div style={{ width: `${(d.gross / maxDeptGross) * 100}%`, height: '100%', backgroundColor: '#618FF5', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, width: '50px', textAlign: 'right' }}>{(d.gross / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><DollarSign size={16} /> Deductions Breakdown</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deductionBreakdown.map(d => (
                <div key={d.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: '12px', color: '#525252' }}>{d.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{fmt(d.value)} IQD</span>
                  </div>
                  <div style={{ height: '20px', backgroundColor: '#f3f4f6' }}>
                    <div style={{ width: `${(d.value / maxDeduction) * 100}%`, height: '100%', backgroundColor: d.color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e4e4e4', paddingTop: '8px' }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Deductions</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>{fmt(totals.deductions)} IQD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Register */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Payroll Register ({payrollCalc.length} employees)</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Basic</th><th>Allowances</th><th>Gross</th><th>SS</th><th>Tax</th><th>Deductions</th><th>Net</th></tr></thead>
              <tbody>
                {payrollCalc.map(p => (
                  <tr key={p.employee_id}>
                    <td><p style={{ fontSize: '13px', fontWeight: 500 }}>{p.employee_name}</p><p style={{ fontSize: '10px', color: '#a3a3a3' }}>{p.employee_number}</p></td>
                    <td style={{ fontSize: '12px', color: '#525252' }}>{p.department}</td>
                    <td style={{ fontSize: '12px' }}>{(p.basic / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px' }}>{((p.housing + p.transport + p.meal) / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{(p.gross / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px', color: '#3B82F6' }}>{(p.ss_employee / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px', color: '#F59E0B' }}>{(p.income_tax / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px', color: '#EF4444' }}>{(p.total_deductions / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>{(p.net / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 700 }}>
                  <td colSpan={2}>TOTAL ({payrollCalc.length} employees)</td>
                  <td>{(payrollCalc.reduce((s, p) => s + p.basic, 0) / 1000000).toFixed(1)}M</td>
                  <td></td>
                  <td>{fmt(totals.gross)}</td>
                  <td style={{ color: '#3B82F6' }}>{(totals.ss / 1000000).toFixed(2)}M</td>
                  <td style={{ color: '#F59E0B' }}>{(totals.tax / 1000000).toFixed(2)}M</td>
                  <td style={{ color: '#EF4444' }}>{fmt(totals.deductions)}</td>
                  <td style={{ color: '#10B981' }}>{fmt(totals.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {payrollCalc.slice(0, 15).map(p => (
              <div key={p.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{p.employee_name}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{p.department}</p>
                <div className="grid grid-cols-3 gap-2 mt-1" style={{ fontSize: '12px' }}>
                  <div><span style={{ color: '#a3a3a3' }}>Gross</span><p style={{ fontWeight: 600 }}>{(p.gross / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Deduct</span><p style={{ color: '#EF4444' }}>{(p.total_deductions / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Net</span><p style={{ fontWeight: 700, color: '#10B981' }}>{(p.net / 1000).toFixed(0)}K</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
