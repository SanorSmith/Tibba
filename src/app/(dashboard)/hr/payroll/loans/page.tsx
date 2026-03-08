'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, DollarSign, Calendar, User, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface Loan {
  id: string;
  employee_id: string;
  employee_name: string;
  loan_amount: number;
  remaining_balance: number;
  monthly_deduction: number;
  deduction_months: number;
  deducted_months: number;
  start_date: string;
  status: string;
  loan_type: string;
  created_at: string;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/payroll/loans');
      const data = await res.json();
      if (data.success) {
        setLoans(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: CheckCircle };
      case 'PENDING':
        return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock };
      case 'COMPLETED':
        return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: CheckCircle };
      case 'REJECTED':
        return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle };
      default:
        return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: AlertTriangle };
    }
  };

  const filteredLoans = filter === 'all' 
    ? loans 
    : loans.filter(l => l.status === filter.toUpperCase());

  const totalActive = loans.filter(l => l.status === 'ACTIVE').length;
  const totalPending = loans.filter(l => l.status === 'PENDING').length;
  const totalAmount = loans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.remaining_balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll">
            <button className="btn-secondary p-2">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Employee Loans</h2>
            <p className="page-description">Manage employee loan requests and deductions</p>
          </div>
        </div>
        <Link href="/hr/payroll/loans/new">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Loan Request
          </button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="tibbna-grid-3 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Active Loans</p>
            <p className="tibbna-card-value">{totalActive}</p>
            <p className="tibbna-card-subtitle">Currently deducting</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Pending Approval</p>
            <p className="tibbna-card-value" style={{ color: '#D97706' }}>{totalPending}</p>
            <p className="tibbna-card-subtitle">Awaiting review</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title">Total Outstanding</p>
            <p className="tibbna-card-value" style={{ color: '#DC2626' }}>
              {(totalAmount * 1450 / 1000000).toFixed(1)}M
            </p>
            <p className="tibbna-card-subtitle">IQD</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 tibbna-section">
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          All ({loans.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          Pending ({totalPending})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          Active ({totalActive})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          Completed
        </button>
      </div>

      {/* Loans List */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>Loan Requests</h3>
        </div>
        <div className="tibbna-card-content">
          {filteredLoans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <DollarSign size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>No loans found</p>
              <p style={{ fontSize: '13px' }}>
                {filter === 'all' 
                  ? 'Create a new loan request to get started'
                  : `No ${filter} loans at this time`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block tibbna-table-container">
                <table className="tibbna-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Loan Amount</th>
                      <th>Remaining</th>
                      <th>Monthly Deduction</th>
                      <th>Progress</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map(loan => {
                      const style = getStatusStyle(loan.status);
                      const progress = loan.deduction_months > 0 
                        ? (loan.deducted_months / loan.deduction_months) * 100 
                        : 0;
                      
                      return (
                        <tr key={loan.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <User size={16} style={{ color: '#9CA3AF' }} />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 500 }}>{loan.employee_name}</p>
                                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{loan.loan_type || 'General'}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 600 }}>
                            {(loan.loan_amount * 1450).toLocaleString()} IQD
                          </td>
                          <td style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                            {(loan.remaining_balance * 1450).toLocaleString()} IQD
                          </td>
                          <td style={{ fontSize: '13px' }}>
                            {(loan.monthly_deduction * 1450).toLocaleString()} IQD
                          </td>
                          <td>
                            <div style={{ width: '100%' }}>
                              <div style={{ 
                                width: '100%', 
                                height: '6px', 
                                backgroundColor: '#E5E7EB', 
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{ 
                                  width: `${progress}%`, 
                                  height: '100%', 
                                  backgroundColor: '#10B981',
                                  transition: 'width 0.3s'
                                }}></div>
                              </div>
                              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                {loan.deducted_months} / {loan.deduction_months} months
                              </p>
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#6B7280' }}>
                            {new Date(loan.start_date).toLocaleDateString()}
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              color: style.color,
                              backgroundColor: style.bg,
                              border: `1px solid ${style.border}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <style.icon size={12} />
                              {loan.status}
                            </span>
                          </td>
                          <td>
                            <Link href={`/hr/payroll/loans/${loan.id}`}>
                              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }}>
                                View Details
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredLoans.map(loan => {
                  const style = getStatusStyle(loan.status);
                  const progress = loan.deduction_months > 0 
                    ? (loan.deducted_months / loan.deduction_months) * 100 
                    : 0;

                  return (
                    <div key={loan.id} className="tibbna-card" style={{ borderLeft: `4px solid ${style.border}` }}>
                      <div className="tibbna-card-content">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{loan.employee_name}</p>
                            <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{loan.loan_type || 'General Loan'}</p>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            color: style.color,
                            backgroundColor: style.bg,
                          }}>
                            {loan.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3" style={{ fontSize: '12px' }}>
                          <div>
                            <span style={{ color: '#6B7280' }}>Loan Amount</span>
                            <p style={{ fontWeight: 600 }}>{(loan.loan_amount * 1450).toLocaleString()} IQD</p>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280' }}>Remaining</span>
                            <p style={{ fontWeight: 600, color: '#DC2626' }}>
                              {(loan.remaining_balance * 1450).toLocaleString()} IQD
                            </p>
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ 
                            width: '100%', 
                            height: '8px', 
                            backgroundColor: '#E5E7EB', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${progress}%`, 
                              height: '100%', 
                              backgroundColor: '#10B981'
                            }}></div>
                          </div>
                          <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                            {loan.deducted_months} / {loan.deduction_months} months completed
                          </p>
                        </div>

                        <Link href={`/hr/payroll/loans/${loan.id}`}>
                          <button className="btn-secondary w-full" style={{ fontSize: '13px' }}>
                            View Details
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
