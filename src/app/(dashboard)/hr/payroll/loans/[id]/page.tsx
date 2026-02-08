'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import payrollData from '@/data/hr/payroll.json';
import employeesData from '@/data/hr/employees.json';

export default function LoanDetailPage() {
  const params = useParams();
  const loan = payrollData.loans.find(l => l.id === params.id) as any;

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Loan Not Found</h2>
        <Link href="/hr/payroll"><button className="btn-primary">Back to Payroll</button></Link>
      </div>
    );
  }

  const employee = employeesData.employees.find(e => e.id === loan.employee_id);
  const paidPct = Math.round((loan.paid / loan.total_installments) * 100);

  const schedule = useMemo(() => {
    const rows = [];
    const startDate = new Date(loan.start_date);
    for (let i = 1; i <= loan.total_installments; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i - 1);
      const isPaid = i <= loan.paid;
      rows.push({
        number: i,
        date: date.toISOString().split('T')[0],
        amount: loan.installment,
        status: isPaid ? 'PAID' : i === loan.paid + 1 ? 'DUE' : 'UPCOMING',
        balance: loan.amount - (loan.installment * Math.min(i, loan.total_installments)),
      });
    }
    return rows;
  }, [loan]);

  const handleExportSchedule = () => {
    const header = 'Installment,Date,Amount (IQD),Status,Remaining Balance';
    const rows = schedule.map(s => [s.number, s.date, s.amount, s.status, Math.max(0, s.balance)].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-schedule-${loan.loan_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Loan {loan.loan_number}</h2>
            <p className="page-description">{loan.type.replace(/_/g, ' ')} - {loan.employee_name}</p>
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={handleExportSchedule}>
          <Download size={14} /> Export Schedule
        </button>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Loan Amount</p>
            <p className="tibbna-card-value">{(loan.amount / 1000000).toFixed(1)}M</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Monthly Installment</p>
            <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(loan.installment / 1000).toFixed(0)}K</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Remaining Balance</p>
            <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(loan.balance / 1000000).toFixed(1)}M</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Progress</p>
            <p className="tibbna-card-value" style={{ color: '#10B981' }}>{paidPct}%</p>
            <p className="tibbna-card-subtitle">{loan.paid}/{loan.total_installments} paid</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Progress Bar */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Repayment Progress</h3></div>
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1" style={{ height: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                  <div style={{ width: `${paidPct}%`, height: '100%', backgroundColor: paidPct >= 100 ? '#10B981' : '#618FF5', borderRadius: '6px', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{paidPct}%</span>
              </div>
              <div className="grid grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#a3a3a3' }}>Total Paid</p>
                  <p style={{ fontWeight: 700, color: '#10B981' }}>{((loan.amount - loan.balance) / 1000000).toFixed(2)}M IQD</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#a3a3a3' }}>Remaining</p>
                  <p style={{ fontWeight: 700, color: '#EF4444' }}>{(loan.balance / 1000000).toFixed(2)}M IQD</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#a3a3a3' }}>Next Due</p>
                  <p style={{ fontWeight: 700 }}>{schedule.find(s => s.status === 'DUE')?.date || 'Completed'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Repayment Schedule */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Repayment Schedule ({loan.total_installments} installments)</h3></div>
            <div className="tibbna-card-content">
              <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tibbna-table">
                  <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Status</th><th>Balance After</th></tr></thead>
                  <tbody>
                    {schedule.map(s => (
                      <tr key={s.number} style={{ backgroundColor: s.status === 'DUE' ? '#FFFBEB' : undefined }}>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{s.number}</td>
                        <td style={{ fontSize: '13px' }}>{s.date}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{(s.amount / 1000).toFixed(0)}K IQD</td>
                        <td>
                          <span className="tibbna-badge" style={{
                            backgroundColor: s.status === 'PAID' ? '#D1FAE5' : s.status === 'DUE' ? '#FEF3C7' : '#f3f4f6',
                            color: s.status === 'PAID' ? '#065F46' : s.status === 'DUE' ? '#92400E' : '#a3a3a3',
                            fontSize: '10px'
                          }}>{s.status}</span>
                        </td>
                        <td style={{ fontSize: '13px', color: Math.max(0, s.balance) === 0 ? '#10B981' : '#525252' }}>{(Math.max(0, s.balance) / 1000).toFixed(0)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {schedule.map(s => (
                  <div key={s.number} style={{ padding: '8px', border: '1px solid #e4e4e4', backgroundColor: s.status === 'DUE' ? '#FFFBEB' : undefined }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>#{s.number} - {s.date}</span>
                      <span className="tibbna-badge" style={{
                        backgroundColor: s.status === 'PAID' ? '#D1FAE5' : s.status === 'DUE' ? '#FEF3C7' : '#f3f4f6',
                        color: s.status === 'PAID' ? '#065F46' : s.status === 'DUE' ? '#92400E' : '#a3a3a3',
                        fontSize: '10px'
                      }}>{s.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{(s.amount / 1000).toFixed(0)}K IQD | Balance: {(Math.max(0, s.balance) / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Loan Details */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Loan Details</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Loan Number</span><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{loan.loan_number}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Type</span><span style={{ fontWeight: 500 }}>{loan.type.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Status</span><SmartStatusBadge status={loan.status} /></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Start Date</span><span style={{ fontWeight: 500 }}>{loan.start_date}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Total Amount</span><span style={{ fontWeight: 600 }}>{(loan.amount / 1000000).toFixed(1)}M IQD</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Installment</span><span style={{ fontWeight: 500 }}>{(loan.installment / 1000).toFixed(0)}K IQD</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Installments</span><span style={{ fontWeight: 500 }}>{loan.paid} / {loan.total_installments}</span></div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee</h3></div>
            <div className="tibbna-card-content">
              {employee ? (
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={`${employee.first_name} ${employee.last_name}`} size="md" />
                  <div>
                    <Link href={`/hr/employees/${employee.id}`} className="hover:underline">
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{employee.first_name} {employee.last_name}</p>
                    </Link>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{employee.department_name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{employee.job_title}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#a3a3a3', fontSize: '13px' }}>{loan.employee_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
