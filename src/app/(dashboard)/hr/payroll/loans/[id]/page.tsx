'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';

interface Loan {
  id: string;
  loan_number: string;
  employee_id: string;
  employee_name: string;
  loan_type: string;
  loan_amount: string;
  monthly_installment: string;
  total_installments: number;
  paid_installments: number;
  remaining_balance: string;
  start_date: string;
  status: string;
  reason: string;
}

export default function LoanDetailPage() {
  const params = useParams();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  // Move useMemo to the top - before any conditional returns
  const schedule = useMemo(() => {
    if (!loan) return [];
    const rows = [];
    const startDate = new Date(loan.start_date);
    for (let i = 1; i <= loan.total_installments; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i - 1);
      const isPaid = i <= loan.paid_installments;
      rows.push({
        number: i,
        date: date.toISOString().split('T')[0],
        amount: parseFloat(loan.monthly_installment),
        status: isPaid ? 'PAID' : i === loan.paid_installments + 1 ? 'DUE' : 'UPCOMING',
        balance: parseFloat(loan.remaining_balance) - (parseFloat(loan.monthly_installment) * Math.min(i, loan.total_installments)),
      });
    }
    return rows;
  }, [loan]);

  // Calculate derived values
  const paidPct = loan ? Math.round((loan.paid_installments / loan.total_installments) * 100) : 0;

  useEffect(() => {
    if (params.id) {
      loadLoan(params.id as string);
    }
  }, [params.id]);

  const loadLoan = async (loanId: string) => {
    setLoading(true);
    try {
      // Get all loans and find the one with matching loan_number
      const res = await fetch('/api/hr/payroll/loans');
      const data = await res.json();
      if (data.success) {
        const foundLoan = data.data.find((l: Loan) => l.loan_number === loanId || l.id === loanId);
        setLoan(foundLoan || null);
      }
    } catch (err) {
      console.error('Failed to load loan:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Loan Not Found</h2>
        <Link href="/hr/payroll"><button className="btn-primary">Back to Payroll</button></Link>
      </div>
    );
  }

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
            <p className="page-description">{loan.loan_type.replace(/_/g, ' ')} - {loan.employee_name}</p>
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
            <p className="tibbna-card-value">{(parseFloat(loan.loan_amount) * 1450 / 1000000).toFixed(1)}M</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Monthly Installment</p>
            <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(parseFloat(loan.monthly_installment) * 1450 / 1000).toFixed(0)}K</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Remaining Balance</p>
            <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(parseFloat(loan.remaining_balance) * 1450 / 1000000).toFixed(1)}M</p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Progress</p>
            <p className="tibbna-card-value" style={{ color: '#10B981' }}>{paidPct}%</p>
            <p className="tibbna-card-subtitle">{loan.paid_installments}/{loan.total_installments} paid</p>
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
                  <p style={{ fontWeight: 700, color: '#10B981' }}>{((parseFloat(loan.loan_amount) - parseFloat(loan.remaining_balance)) * 1450 / 1000000).toFixed(2)}M IQD</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#a3a3a3' }}>Remaining</p>
                  <p style={{ fontWeight: 700, color: '#EF4444' }}>{(parseFloat(loan.remaining_balance) * 1450 / 1000000).toFixed(2)}M IQD</p>
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
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Type</span><span style={{ fontWeight: 500 }}>{loan.loan_type.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Status</span><SmartStatusBadge status={loan.status} /></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Start Date</span><span style={{ fontWeight: 500 }}>{loan.start_date}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Total Amount</span><span style={{ fontWeight: 600 }}>{(parseFloat(loan.loan_amount) * 1450 / 1000000).toFixed(1)}M IQD</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Installment</span><span style={{ fontWeight: 500 }}>{(parseFloat(loan.monthly_installment) * 1450 / 1000).toFixed(0)}K IQD</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Installments</span><span style={{ fontWeight: 500 }}>{loan.paid_installments} / {loan.total_installments}</span></div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee</h3></div>
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={loan.employee_name} size="md" />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{loan.employee_name}</p>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Employee ID: {loan.employee_id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
