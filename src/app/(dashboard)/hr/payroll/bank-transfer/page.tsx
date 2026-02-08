'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, CheckCircle, Building2 } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import payrollData from '@/data/hr/payroll.json';

export default function BankTransferPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(payrollData.payroll_periods[payrollData.payroll_periods.length - 1].id);
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');
  const [generated, setGenerated] = useState(false);

  const period = payrollData.payroll_periods.find(p => p.id === selectedPeriod)!;
  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');

  const transferData = useMemo(() => {
    return activeEmployees.map(emp => {
      const basic = emp.basic_salary || 1000000;
      const housing = Math.round(basic * 0.20);
      const transport = 150000;
      const meal = 100000;
      const gross = basic + housing + transport + meal;
      const deductions = Math.round(basic * 0.08);
      const net = gross - deductions;
      const bankNames = ['Rasheed Bank', 'Rafidain Bank', 'Trade Bank of Iraq', 'Al-Mansour Bank', 'Baghdad Bank'];
      return {
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_number: emp.employee_number,
        bank_name: bankNames[Math.floor(Math.random() * bankNames.length)],
        account_number: `IQ${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
        iban: `IQ${String(Math.floor(Math.random() * 90) + 10)}RSHD${String(Math.floor(Math.random() * 900000000000) + 100000000000)}`,
        net_salary: net,
        currency: 'IQD',
      };
    });
  }, [activeEmployees]);

  const totalAmount = transferData.reduce((s, t) => s + t.net_salary, 0);

  const handleGenerate = () => {
    const header = format === 'csv'
      ? 'Employee Name,Employee Number,Bank Name,Account Number,IBAN,Amount,Currency'
      : 'Employee Name\tEmployee Number\tBank Name\tAccount Number\tIBAN\tAmount\tCurrency';
    const sep = format === 'csv' ? ',' : '\t';
    const rows = transferData.map(t =>
      [t.employee_name, t.employee_number, t.bank_name, t.account_number, t.iban, t.net_salary, t.currency].join(sep)
    );
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-transfer-${period.name.replace(/\s/g, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerated(true);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Bank Transfer File</h2>
            <p className="page-description">Generate bank transfer file for payroll disbursement</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Payroll Period</label>
              <select className="tibbna-input" value={selectedPeriod} onChange={e => { setSelectedPeriod(e.target.value); setGenerated(false); }}>
                {payrollData.payroll_periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>File Format</label>
              <select className="tibbna-input" value={format} onChange={e => setFormat(e.target.value as 'csv' | 'txt')}>
                <option value="csv">CSV (Comma Separated)</option>
                <option value="txt">TXT (Tab Separated)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-primary flex items-center gap-2 w-full justify-center" onClick={handleGenerate}>
                <Download size={16} /> Generate & Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {generated && (
        <div style={{ padding: '12px', backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7', marginBottom: '16px' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} style={{ color: '#065F46' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#065F46' }}>File generated and downloaded successfully</span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Employees</p><p className="tibbna-card-value">{transferData.length}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Amount</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{(totalAmount / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Period</p><p className="tibbna-card-value" style={{ fontSize: '16px' }}>{period.name}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Format</p><p className="tibbna-card-value" style={{ fontSize: '16px' }}>{format.toUpperCase()}</p></div></div>
      </div>

      {/* Preview Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Transfer Preview</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Bank</th><th>Account</th><th>IBAN</th><th>Amount (IQD)</th></tr></thead>
              <tbody>
                {transferData.map(t => (
                  <tr key={t.employee_number}>
                    <td><p style={{ fontSize: '13px', fontWeight: 500 }}>{t.employee_name}</p><p style={{ fontSize: '10px', color: '#a3a3a3' }}>{t.employee_number}</p></td>
                    <td style={{ fontSize: '12px' }}>{t.bank_name}</td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{t.account_number}</td>
                    <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#525252' }}>{t.iban}</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{(t.net_salary / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {transferData.slice(0, 10).map(t => (
              <div key={t.employee_number} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.employee_name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{(t.net_salary / 1000).toFixed(0)}K</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{t.bank_name} | {t.account_number}</p>
              </div>
            ))}
            {transferData.length > 10 && <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' }}>+{transferData.length - 10} more employees</p>}
          </div>
        </div>
      </div>
    </>
  );
}
