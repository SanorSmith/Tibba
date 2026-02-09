'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Download, Plus } from 'lucide-react';
import payrollData from '@/data/hr/payroll.json';

export default function PayrollPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(payrollData.payroll_periods[payrollData.payroll_periods.length - 1].id);
  const period = payrollData.payroll_periods.find(p => p.id === selectedPeriod)!;
  const summaries = payrollData.payroll_summary.filter(s => s.period === selectedPeriod || selectedPeriod === payrollData.payroll_periods[0].id);
  const loans = payrollData.loans;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Payroll & Compensation</h2>
          <p className="page-description">Salary processing, loans, and compensation management</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="tibbna-input" style={{ width: 'auto' }}>
            {payrollData.payroll_periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Link href="/hr/payroll/loans/new">
            <button className="btn-secondary flex items-center gap-2"><Plus size={14} /><span className="hidden sm:inline">New Loan</span></button>
          </Link>
          <Link href="/hr/payroll/process">
            <button className="btn-primary flex items-center gap-2"><FileText size={14} /><span className="hidden sm:inline">Process Payroll</span></button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Gross</p><p className="tibbna-card-value">{(period.total_gross / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><DollarSign size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Net</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{(period.total_net / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><TrendingUp size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Deductions</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(period.total_deductions / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><TrendingDown size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Employees</p><p className="tibbna-card-value">{period.total_employees}</p><p className="tibbna-card-subtitle">{period.status}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><CreditCard size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Period Status */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header">
          <div className="flex items-center justify-between">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>{period.name} - Payroll Status</h3>
            <span className="tibbna-badge" style={{
              backgroundColor: period.status === 'PAID' ? '#D1FAE5' : period.status === 'PROCESSING' ? '#FEF3C7' : '#DBEAFE',
              color: period.status === 'PAID' ? '#065F46' : period.status === 'PROCESSING' ? '#92400E' : '#1D4ED8'
            }}>{period.status}</span>
          </div>
        </div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
            <div><span style={{ color: '#a3a3a3' }}>Period Start</span><p style={{ fontWeight: 500 }}>{period.start_date}</p></div>
            <div><span style={{ color: '#a3a3a3' }}>Period End</span><p style={{ fontWeight: 500 }}>{period.end_date}</p></div>
            <div><span style={{ color: '#a3a3a3' }}>Payment Date</span><p style={{ fontWeight: 500 }}>{period.payment_date}</p></div>
            <div><span style={{ color: '#a3a3a3' }}>Employees</span><p style={{ fontWeight: 500 }}>{period.total_employees}</p></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Link href="/hr/payroll/process">
              <button className="btn-primary flex items-center justify-center gap-2"><FileText size={14} /> Generate Payslips</button>
            </Link>
            <Link href="/hr/payroll/bank-transfer">
              <button className="btn-secondary flex items-center justify-center gap-2"><Download size={14} /> Export Bank File</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Payroll Details Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee Payroll Details</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Basic</th><th>Allowances</th><th>Gross</th><th>Deductions</th><th>Net</th></tr></thead>
              <tbody>
                {summaries.map(s => (
                  <tr key={s.employee_id}>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{s.employee_name}</td>
                    <td style={{ fontSize: '12px', color: '#525252' }}>{s.department}</td>
                    <td style={{ fontSize: '13px' }}>{(s.basic / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px' }}>{((s.housing + s.transport + s.meal + s.mobile + s.overtime + s.night_shift + s.hazard) / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{(s.gross / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', color: '#EF4444' }}>{(s.total_deductions / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{(s.net / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {summaries.map(s => (
              <div key={s.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{s.employee_name}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{s.department}</p>
                <div className="grid grid-cols-3 gap-2 mt-2" style={{ fontSize: '12px' }}>
                  <div><span style={{ color: '#a3a3a3' }}>Gross</span><p style={{ fontWeight: 600 }}>{(s.gross / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Deductions</span><p style={{ fontWeight: 500, color: '#EF4444' }}>{(s.total_deductions / 1000).toFixed(0)}K</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Net</span><p style={{ fontWeight: 700, color: '#10B981' }}>{(s.net / 1000).toFixed(0)}K</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Grades */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Salary Grades</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Grade</th><th>Name</th><th>Min Salary</th><th>Max Salary</th><th>Currency</th></tr></thead>
              <tbody>
                {payrollData.salary_grades.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.code}</td>
                    <td>{g.name}</td>
                    <td>{(g.min_salary / 1000000).toFixed(1)}M</td>
                    <td>{(g.max_salary / 1000000).toFixed(1)}M</td>
                    <td>{g.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {payrollData.salary_grades.map(g => (
              <div key={g.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
                <div><span style={{ fontWeight: 600 }}>{g.code}</span> - {g.name}</div>
                <span style={{ color: '#525252' }}>{(g.min_salary / 1000000).toFixed(1)}-{(g.max_salary / 1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loans */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Active Loans & Advances</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Loan #</th><th>Employee</th><th>Type</th><th>Amount</th><th>Installment</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id} onClick={() => window.location.href = `/hr/payroll/loans/${l.id}`} className="cursor-pointer hover:bg-gray-50">
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{l.loan_number}</td>
                    <td style={{ fontSize: '13px' }}>{l.employee_name}</td>
                    <td><span className="tibbna-badge badge-info">{l.type}</span></td>
                    <td style={{ fontSize: '13px' }}>{(l.amount / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px' }}>{(l.installment / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px' }}>{l.paid}/{l.total_installments}</td>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{(l.balance / 1000).toFixed(0)}K</td>
                    <td><span className="tibbna-badge" style={{ backgroundColor: l.status === 'ACTIVE' ? '#D1FAE5' : '#F3F4F6', color: l.status === 'ACTIVE' ? '#065F46' : '#6B7280' }}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {loans.map(l => (
              <Link key={l.id} href={`/hr/payroll/loans/${l.id}`}>
                <div style={{ padding: '10px', border: '1px solid #e4e4e4' }} className="cursor-pointer active:bg-gray-50">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{l.employee_name}</span>
                    <span className="tibbna-badge" style={{ backgroundColor: l.status === 'ACTIVE' ? '#D1FAE5' : '#F3F4F6', color: l.status === 'ACTIVE' ? '#065F46' : '#6B7280', fontSize: '10px' }}>{l.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{l.type} - {l.loan_number}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2" style={{ fontSize: '12px' }}>
                    <div><span style={{ color: '#a3a3a3' }}>Amount</span><p style={{ fontWeight: 500 }}>{(l.amount / 1000).toFixed(0)}K</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Paid</span><p style={{ fontWeight: 500 }}>{l.paid}/{l.total_installments}</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Balance</span><p style={{ fontWeight: 600 }}>{(l.balance / 1000).toFixed(0)}K</p></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
