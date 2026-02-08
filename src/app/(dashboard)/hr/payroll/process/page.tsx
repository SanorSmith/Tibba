'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, DollarSign, Users, FileText, Download, ArrowRight } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import attendanceData from '@/data/hr/attendance.json';
import payrollData from '@/data/hr/payroll.json';

const STEPS = ['Select Period', 'Import Attendance', 'Calculate Salary', 'Review & Approve', 'Generate Outputs'];

export default function PayrollProcessPage() {
  const [step, setStep] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [approved, setApproved] = useState(false);
  const [completed, setCompleted] = useState(false);

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const period = payrollData.payroll_periods.find(p => p.id === selectedPeriod);

  const attendanceSummary = useMemo(() => {
    return activeEmployees.map(emp => {
      const records = attendanceData.daily_summaries.filter(a => a.employee_id === emp.id);
      const daysWorked = records.filter(r => r.status === 'PRESENT').length;
      const regularHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
      const overtimeHours = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
      const absentDays = records.filter(r => r.status === 'ABSENT').length;
      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department_name,
        days_worked: daysWorked || 22,
        regular_hours: regularHours || 176,
        overtime_hours: overtimeHours,
        absent_days: absentDays,
      };
    });
  }, [activeEmployees]);

  const payrollCalc = useMemo(() => {
    return activeEmployees.map(emp => {
      const basic = emp.basic_salary || 1000000;
      const att = attendanceSummary.find(a => a.employee_id === emp.id);
      const housing = Math.round(basic * 0.20);
      const transport = 150000;
      const meal = 100000;
      const overtimeAmount = att ? Math.round((basic / 176) * 1.5 * att.overtime_hours) : 0;
      const nightShift = (emp as any).shift_id === 'SHIFT-NIGHT' ? Math.round(basic * 0.15) : 0;
      const gross = basic + housing + transport + meal + overtimeAmount + nightShift;
      const ssEmployee = Math.round(basic * 0.05);
      const ssEmployer = Math.round(basic * 0.12);
      const incomeTax = Math.round(gross * 0.03);
      const loanRepayment = payrollData.loans.find(l => l.employee_id === emp.id && l.status === 'ACTIVE')
        ? (payrollData.loans.find(l => l.employee_id === emp.id)! as any).installment || 0
        : 0;
      const absenceDeduction = att ? Math.round((basic / 30) * att.absent_days) : 0;
      const totalDeductions = ssEmployee + incomeTax + loanRepayment + absenceDeduction;
      const net = gross - totalDeductions;

      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department_name,
        grade: emp.grade_id || '-',
        basic,
        housing,
        transport,
        meal,
        overtime: overtimeAmount,
        night_shift: nightShift,
        gross,
        ss_employee: ssEmployee,
        ss_employer: ssEmployer,
        income_tax: incomeTax,
        loan_repayment: loanRepayment,
        absence_deduction: absenceDeduction,
        total_deductions: totalDeductions,
        net,
      };
    });
  }, [activeEmployees, attendanceSummary]);

  const totals = useMemo(() => ({
    employees: payrollCalc.length,
    gross: payrollCalc.reduce((s, p) => s + p.gross, 0),
    deductions: payrollCalc.reduce((s, p) => s + p.total_deductions, 0),
    net: payrollCalc.reduce((s, p) => s + p.net, 0),
  }), [payrollCalc]);

  const fmt = (n: number) => `${(n / 1000000).toFixed(2)}M`;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <CheckCircle size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Payroll Processing Complete</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>{totals.employees} employees processed. Total Net: {fmt(totals.net)} IQD</p>
        <div className="flex gap-3 mt-4">
          <Link href="/hr/payroll"><button className="btn-primary">View Payroll</button></Link>
          <Link href="/hr/payroll/bank-transfer"><button className="btn-secondary">Bank Transfer</button></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Process Payroll</h2>
            <p className="page-description">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: i < step ? '#D1FAE5' : i === step ? '#DBEAFE' : '#F3F4F6',
                      color: i < step ? '#065F46' : i === step ? '#1D4ED8' : '#9CA3AF',
                    }}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block" style={{ fontSize: '10px', fontWeight: i === step ? 600 : 400, color: i === step ? '#111827' : '#9CA3AF', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="h-0.5 w-4 sm:w-8" style={{ backgroundColor: i < step ? '#6EE7B7' : '#E5E7EB', marginBottom: '16px' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 0: Select Period */}
      {step === 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Select Payroll Period</h3></div>
          <div className="tibbna-card-content space-y-4">
            <select className="tibbna-input" style={{ maxWidth: '400px' }} value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
              <option value="">Choose a period...</option>
              {payrollData.payroll_periods.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
            {period && (
              <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
                  <div><span style={{ color: '#a3a3a3' }}>Start</span><p style={{ fontWeight: 500 }}>{period.start_date}</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>End</span><p style={{ fontWeight: 500 }}>{period.end_date}</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Status</span><p style={{ fontWeight: 500 }}>{period.status}</p></div>
                  <div><span style={{ color: '#a3a3a3' }}>Employees</span><p style={{ fontWeight: 500 }}>{period.total_employees}</p></div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button className="btn-primary flex items-center gap-2" disabled={!selectedPeriod} onClick={() => setStep(1)}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Import Attendance */}
      {step === 1 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Attendance Summary</h3></div>
          <div className="tibbna-card-content">
            <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="tibbna-table">
                <thead><tr><th>Employee</th><th>Department</th><th>Days Worked</th><th>Regular Hours</th><th>Overtime Hours</th><th>Absent Days</th></tr></thead>
                <tbody>
                  {attendanceSummary.slice(0, 20).map(a => (
                    <tr key={a.employee_id}>
                      <td style={{ fontSize: '13px', fontWeight: 500 }}>{a.employee_name}</td>
                      <td style={{ fontSize: '12px', color: '#525252' }}>{a.department}</td>
                      <td style={{ fontSize: '13px' }}>{a.days_worked}</td>
                      <td style={{ fontSize: '13px' }}>{a.regular_hours}h</td>
                      <td style={{ fontSize: '13px', color: a.overtime_hours > 0 ? '#F59E0B' : '#a3a3a3' }}>{a.overtime_hours}h</td>
                      <td style={{ fontSize: '13px', color: a.absent_days > 0 ? '#EF4444' : '#a3a3a3' }}>{a.absent_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="md:hidden" style={{ fontSize: '13px', color: '#525252', padding: '16px', textAlign: 'center' }}>
              {attendanceSummary.length} employees loaded. View on desktop for full table.
            </p>
            <div className="flex justify-between mt-4">
              <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Calculate Salary */}
      {step === 2 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Salary Calculation</h3></div>
          <div className="tibbna-card-content">
            <div className="tibbna-grid-4 mb-4">
              <div style={{ textAlign: 'center', padding: '12px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '20px', fontWeight: 700 }}>{totals.employees}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Employees</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '20px', fontWeight: 700 }}>{fmt(totals.gross)}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Total Gross</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>{fmt(totals.deductions)}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Total Deductions</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>{fmt(totals.net)}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Total Net</p>
              </div>
            </div>
            <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="tibbna-table">
                <thead><tr><th>Employee</th><th>Basic</th><th>Allowances</th><th>OT</th><th>Gross</th><th>SS</th><th>Tax</th><th>Loan</th><th>Deductions</th><th>Net</th></tr></thead>
                <tbody>
                  {payrollCalc.slice(0, 20).map(p => (
                    <tr key={p.employee_id}>
                      <td><p style={{ fontSize: '13px', fontWeight: 500 }}>{p.employee_name}</p><p style={{ fontSize: '10px', color: '#a3a3a3' }}>{p.department}</p></td>
                      <td style={{ fontSize: '12px' }}>{(p.basic / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px' }}>{((p.housing + p.transport + p.meal) / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px', color: p.overtime > 0 ? '#F59E0B' : '#a3a3a3' }}>{p.overtime > 0 ? `${(p.overtime / 1000).toFixed(0)}K` : '-'}</td>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>{(p.gross / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px' }}>{(p.ss_employee / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px' }}>{(p.income_tax / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px', color: p.loan_repayment > 0 ? '#EF4444' : '#a3a3a3' }}>{p.loan_repayment > 0 ? `${(p.loan_repayment / 1000).toFixed(0)}K` : '-'}</td>
                      <td style={{ fontSize: '12px', color: '#EF4444' }}>{(p.total_deductions / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>{(p.net / 1000).toFixed(0)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2 mt-2">
              {payrollCalc.slice(0, 10).map(p => (
                <div key={p.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{p.employee_name}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1" style={{ fontSize: '12px' }}>
                    <div><span style={{ color: '#a3a3a3' }}>Gross</span><p style={{ fontWeight: 600 }}>{(p.gross / 1000).toFixed(0)}K</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Deduct</span><p style={{ color: '#EF4444' }}>{(p.total_deductions / 1000).toFixed(0)}K</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Net</span><p style={{ fontWeight: 700, color: '#10B981' }}>{(p.net / 1000).toFixed(0)}K</p></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Approve */}
      {step === 3 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Review & Approve Payroll</h3></div>
          <div className="tibbna-card-content space-y-4">
            <div style={{ padding: '16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>Payroll Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#92400E' }}>Total Employees</span><p style={{ fontWeight: 700, fontSize: '18px' }}>{totals.employees}</p></div>
                <div><span style={{ color: '#92400E' }}>Total Gross</span><p style={{ fontWeight: 700, fontSize: '18px' }}>{fmt(totals.gross)} IQD</p></div>
                <div><span style={{ color: '#92400E' }}>Total Deductions</span><p style={{ fontWeight: 700, fontSize: '18px', color: '#EF4444' }}>{fmt(totals.deductions)} IQD</p></div>
                <div><span style={{ color: '#92400E' }}>Total Net</span><p style={{ fontWeight: 700, fontSize: '18px', color: '#10B981' }}>{fmt(totals.net)} IQD</p></div>
              </div>
            </div>
            {!approved ? (
              <div className="flex justify-between">
                <button className="btn-secondary" onClick={() => setStep(2)}>Back to Edit</button>
                <button className="btn-primary flex items-center gap-2" onClick={() => setApproved(true)} style={{ backgroundColor: '#10B981' }}>
                  <CheckCircle size={16} /> Approve Payroll
                </button>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px', backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#065F46' }}>Payroll Approved Successfully</p>
                </div>
                <div className="flex justify-end">
                  <button className="btn-primary flex items-center gap-2" onClick={() => setStep(4)}>
                    Generate Outputs <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Generate Outputs */}
      {step === 4 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Generate Outputs</h3></div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                className="flex items-center gap-3 p-4 hover:bg-[#f5f5f5] transition-colors"
                style={{ border: '1px solid #e4e4e4' }}
                onClick={() => alert('Bank transfer CSV generated (simulated)')}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                  <Download size={24} style={{ color: '#3B82F6' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Bank Transfer File</p>
                  <p style={{ fontSize: '12px', color: '#525252' }}>Generate CSV for bank processing</p>
                </div>
              </button>
              <button
                className="flex items-center gap-3 p-4 hover:bg-[#f5f5f5] transition-colors"
                style={{ border: '1px solid #e4e4e4' }}
                onClick={() => alert('Payslips generated for all employees (simulated)')}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <FileText size={24} style={{ color: '#10B981' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Generate Payslips</p>
                  <p style={{ fontSize: '12px', color: '#525252' }}>PDF payslips for {totals.employees} employees</p>
                </div>
              </button>
            </div>
            <div className="flex justify-between mt-4">
              <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setCompleted(true)} style={{ backgroundColor: '#10B981' }}>
                <CheckCircle size={16} /> Mark as Paid & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
