'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Users } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';

export default function HousingBenefitsPage() {
  const employees = employeesData.employees;
  const activeEmps = employees.filter(e => e.employment_status === 'ACTIVE');
  const housingAllowanceTotal = activeEmps.reduce((s, e) => s + Math.round(e.basic_salary * 0.20), 0);

  const byGrade = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    activeEmps.forEach(e => {
      const g = e.grade_id;
      if (!map[g]) map[g] = { count: 0, total: 0 };
      map[g].count++;
      map[g].total += Math.round(e.basic_salary * 0.20);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeEmps]);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/benefits"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Housing Benefits</h2>
            <p className="page-description">Housing allowances and accommodation support</p>
          </div>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Receiving Allowance</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{activeEmps.length}</p></div><Users size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Monthly Total</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(housingAllowanceTotal / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Avg per Employee</p><p className="tibbna-card-value">{activeEmps.length > 0 ? (housingAllowanceTotal / activeEmps.length / 1000).toFixed(0) : 0}K</p><p className="tibbna-card-subtitle">IQD/month</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Rate</p><p className="tibbna-card-value">20%</p><p className="tibbna-card-subtitle">of basic salary</p></div></div>
      </div>

      {/* Policy */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Housing Allowance Policy</h3></div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Calculation</p>
              <p style={{ fontWeight: 600 }}>20% of Basic Salary</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Eligibility</p>
              <p style={{ fontWeight: 600 }}>All Active Employees</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Payment</p>
              <p style={{ fontWeight: 600 }}>Monthly with Salary</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Taxable</p>
              <p style={{ fontWeight: 600 }}>Yes</p>
            </div>
          </div>
        </div>
      </div>

      {/* By Grade */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Housing Allowance by Grade</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Grade</th><th>Employees</th><th>Avg Allowance</th><th>Total Monthly</th></tr></thead>
              <tbody>
                {byGrade.map(([grade, data]) => (
                  <tr key={grade}>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{grade}</td>
                    <td style={{ fontSize: '13px' }}>{data.count}</td>
                    <td style={{ fontSize: '13px' }}>{(data.total / data.count / 1000).toFixed(0)}K IQD</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{(data.total / 1000).toFixed(0)}K IQD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {byGrade.map(([grade, data]) => (
              <div key={grade} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{grade}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{(data.total / 1000).toFixed(0)}K IQD</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{data.count} employees | Avg: {(data.total / data.count / 1000).toFixed(0)}K IQD</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>All Employees ({activeEmps.length})</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Grade</th><th>Basic Salary</th><th>Housing (20%)</th></tr></thead>
              <tbody>
                {activeEmps.map(e => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/hr/employees/${e.id}`} className="hover:underline" style={{ fontSize: '13px', fontWeight: 500 }}>{e.first_name} {e.last_name}</Link>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.department_name}</p>
                    </td>
                    <td style={{ fontSize: '12px' }}>{e.grade_id}</td>
                    <td style={{ fontSize: '12px' }}>{(e.basic_salary / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{(e.basic_salary * 0.20 / 1000).toFixed(0)}K IQD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {activeEmps.slice(0, 20).map(e => (
              <div key={e.id} style={{ padding: '8px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{e.first_name} {e.last_name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{(e.basic_salary * 0.20 / 1000).toFixed(0)}K</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.department_name} | {e.grade_id}</p>
              </div>
            ))}
            {activeEmps.length > 20 && <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' }}>+{activeEmps.length - 20} more</p>}
          </div>
        </div>
      </div>
    </>
  );
}
