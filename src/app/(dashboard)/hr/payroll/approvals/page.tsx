'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Shield, ChevronRight, AlertTriangle } from 'lucide-react';

interface ApprovalRecord {
  id: string;
  period_id: string;
  step_number: number;
  approver_role: string;
  approver_name: string | null;
  status: string;
  comments: string | null;
  approved_at: string | null;
  created_at: string;
  period_name: string;
  start_date: string;
  end_date: string;
  employee_count: number;
  gross_total: number;
  net_total: number;
  deductions_total: number;
}

interface PayrollPeriod {
  id: string;
  period_name: string;
  status: string;
  total_employees: number;
  total_gross: number;
  total_net: number;
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRecord[]>([]);
  const [historyApprovals, setHistoryApprovals] = useState<ApprovalRecord[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes, periodsRes] = await Promise.all([
        fetch('/api/hr/payroll/approvals?status=PENDING'),
        fetch('/api/hr/payroll/approvals?status=APPROVED'),
        fetch('/api/hr/payroll/approvals?status=REJECTED'),
        fetch('/api/hr/payroll/periods'),
      ]);

      const pending = await pendingRes.json();
      const approved = await approvedRes.json();
      const rejected = await rejectedRes.json();
      const periodsData = await periodsRes.json();

      setPendingApprovals(pending.data || []);
      setHistoryApprovals([...(approved.data || []), ...(rejected.data || [])]);
      setPeriods(periodsData.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (periodId: string) => {
    setActionLoading(periodId);
    try {
      const res = await fetch('/api/hr/payroll/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: periodId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || 'Failed to submit');
      }
    } catch (err) {
      alert('Failed to submit for approval');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (approvalId: string, action: 'approve' | 'reject') => {
    const comments = action === 'reject'
      ? prompt('Enter rejection reason:')
      : prompt('Enter approval comments (optional):');

    if (action === 'reject' && !comments) return;

    setActionLoading(approvalId);
    try {
      const res = await fetch('/api/hr/payroll/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action,
          comments: comments || '',
          approver_name: 'Current User',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock };
      case 'APPROVED': return { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: CheckCircle };
      case 'REJECTED': return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle };
      case 'WAITING': return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: Clock };
      default: return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: Clock };
    }
  };

  const calculatedPeriods = periods.filter(p => p.status === 'CALCULATED');

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
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Payroll Approvals</h2>
            <p className="page-description">Review and approve payroll calculations</p>
          </div>
        </div>
      </div>

      {/* Submit for Approval Section */}
      {calculatedPeriods.length > 0 && (
        <div className="tibbna-card tibbna-section" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="tibbna-card-content">
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1E40AF' }}>
              <Shield size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Ready for Approval
            </h3>
            <div className="space-y-3">
              {calculatedPeriods.map(p => (
                <div key={p.id} className="flex items-center justify-between" style={{ padding: '12px', background: '#EFF6FF', borderRadius: '8px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{p.period_name}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>
                      {p.total_employees} employees | Gross: {(parseFloat(String(p.total_gross || 0)) * 1450).toLocaleString()} IQD | Net: {(parseFloat(String(p.total_net || 0)) * 1450).toLocaleString()} IQD
                    </p>
                  </div>
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => handleSubmitForApproval(p.id)}
                    disabled={actionLoading === p.id}
                    style={{ fontSize: '13px' }}
                  >
                    {actionLoading === p.id ? 'Submitting...' : 'Submit for Approval'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 tibbna-section">
        <button
          onClick={() => setTab('pending')}
          className={tab === 'pending' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          Pending ({pendingApprovals.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={tab === 'history' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '13px' }}
        >
          History ({historyApprovals.length})
        </button>
      </div>

      {/* Pending Approvals */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="tibbna-card">
              <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '16px', fontWeight: 600 }}>No pending approvals</p>
                <p style={{ fontSize: '13px' }}>All payroll periods have been processed</p>
              </div>
            </div>
          ) : (
            pendingApprovals.map(approval => {
              const style = getStatusStyle(approval.status);
              return (
                <div key={approval.id} className="tibbna-card" style={{ borderLeft: `4px solid ${style.border}` }}>
                  <div className="tibbna-card-content">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{approval.period_name}</h3>
                        <p style={{ fontSize: '12px', color: '#6B7280' }}>
                          Step {approval.step_number}: {approval.approver_role}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: '#6B7280' }}>Net Payable</p>
                        <p style={{ fontSize: '22px', fontWeight: 700, color: '#16A34A' }}>
                          {(parseFloat(String(approval.net_total || 0)) * 1450).toLocaleString()} IQD
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4" style={{ fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#6B7280' }}>Employees</span>
                        <p style={{ fontWeight: 600 }}>{approval.employee_count || 0}</p>
                      </div>
                      <div>
                        <span style={{ color: '#6B7280' }}>Gross Salary</span>
                        <p style={{ fontWeight: 600 }}>{(parseFloat(String(approval.gross_total || 0)) * 1450).toLocaleString()} IQD</p>
                      </div>
                      <div>
                        <span style={{ color: '#6B7280' }}>Total Deductions</span>
                        <p style={{ fontWeight: 600, color: '#DC2626' }}>{(parseFloat(String(approval.deductions_total || 0)) * 1450).toLocaleString()} IQD</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction(approval.id, 'approve')}
                        disabled={actionLoading === approval.id}
                        className="flex-1 flex items-center justify-center gap-2"
                        style={{
                          padding: '10px', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                          background: '#16A34A', color: 'white', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <CheckCircle size={16} />
                        {actionLoading === approval.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(approval.id, 'reject')}
                        disabled={actionLoading === approval.id}
                        className="flex-1 flex items-center justify-center gap-2"
                        style={{
                          padding: '10px', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                          background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                      <Link href={`/hr/payroll`}>
                        <button className="btn-secondary" style={{ height: '100%', fontSize: '13px' }}>
                          View Details
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Approval History */}
      {tab === 'history' && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Approval History</h3>
          </div>
          <div className="tibbna-card-content">
            {historyApprovals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                <Clock size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No approval history yet</p>
              </div>
            ) : (
              <div className="tibbna-table-container">
                <table className="tibbna-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Step</th>
                      <th>Role</th>
                      <th>Approver</th>
                      <th>Status</th>
                      <th>Comments</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyApprovals.map(a => {
                      const style = getStatusStyle(a.status);
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 500 }}>{a.period_name}</td>
                          <td style={{ textAlign: 'center' }}>{a.step_number}</td>
                          <td>{a.approver_role}</td>
                          <td>{a.approver_name || '-'}</td>
                          <td>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                              color: style.color, background: style.bg,
                            }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.comments || '-'}
                          </td>
                          <td style={{ color: '#6B7280' }}>
                            {a.approved_at ? new Date(a.approved_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
