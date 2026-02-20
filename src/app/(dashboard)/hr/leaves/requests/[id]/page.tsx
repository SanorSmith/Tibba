'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';
import leavesData from '@/data/hr/leaves.json';
import employeesData from '@/data/hr/employees.json';

export default function LeaveRequestDetailPage() {
  const params = useParams();
  const request = leavesData.leave_requests.find(lr => lr.id === params.id) as any;
  const [status, setStatus] = useState(request?.status || 'PENDING_APPROVAL');
  const [comment, setComment] = useState('');
  const [showAction, setShowAction] = useState(false);

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Leave Request Not Found</h2>
        <Link href="/hr/leaves"><button className="btn-primary">Back to Leaves</button></Link>
      </div>
    );
  }

  const employee = employeesData.employees.find(e => e.id === request.employee_id);
  const leaveType = leavesData.leave_types.find(lt => lt.id === request.leave_type_id);
  const balance = leavesData.leave_balances.find(b => b.employee_id === request.employee_id) as any;

  const approvalSteps = [
    { label: 'Submitted', status: 'APPROVED' as const, approver: request.employee_name, date: request.submitted_at },
    {
      label: 'Manager Approval',
      status: status === 'APPROVED' ? 'APPROVED' as const : status === 'REJECTED' ? 'REJECTED' as const : 'PENDING' as const,
      approver: request.approver_name,
      date: request.approved_at
    },
    {
      label: 'HR Confirmation',
      status: status === 'APPROVED' ? 'APPROVED' as const : 'NOT_STARTED' as const,
    },
  ];

  const handleApprove = () => {
    setStatus('APPROVED');
    setShowAction(false);
    setComment('');
  };

  const handleReject = () => {
    setStatus('REJECTED');
    setShowAction(false);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Request {request.request_number}</h2>
            <p className="page-description">{request.leave_type} - {request.employee_name}</p>
          </div>
        </div>
        {status === 'PENDING_APPROVAL' && (
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1" style={{ color: '#EF4444' }} onClick={() => { setShowAction(true); }}>
              <XCircle size={14} /> Reject
            </button>
            <button className="btn-primary flex items-center gap-1" onClick={handleApprove}>
              <CheckCircle size={14} /> Approve
            </button>
          </div>
        )}
      </div>

      {/* Approval Workflow */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Approval Workflow</h3></div>
        <div className="tibbna-card-content">
          <ApprovalWorkflow steps={approvalSteps} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Request Details</h3></div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Request Number</span>
                  <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{request.request_number}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Status</span>
                  <div className="mt-1"><SmartStatusBadge status={status} /></div>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Leave Type</span>
                  <div className="flex items-center gap-2 mt-1">
                    {leaveType && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: leaveType.color }} />}
                    <p style={{ fontWeight: 500 }}>{request.leave_type}</p>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Total Days</span>
                  <p style={{ fontWeight: 600, fontSize: '18px' }}>{request.total_days}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Start Date</span>
                  <p style={{ fontWeight: 500 }}>{request.start_date}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>End Date</span>
                  <p style={{ fontWeight: 500 }}>{request.end_date}</p>
                </div>
                <div className="sm:col-span-2">
                  <span style={{ color: '#a3a3a3' }}>Reason</span>
                  <p style={{ fontWeight: 500, marginTop: '4px' }}>{request.reason}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Submitted</span>
                  <p style={{ fontWeight: 500 }}>{request.submitted_at || 'Draft'}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3' }}>Approver</span>
                  <p style={{ fontWeight: 500 }}>{request.approver_name || 'N/A'}</p>
                </div>
              </div>
              {status === 'REJECTED' && request.rejection_reason && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B' }}>Rejection Reason</p>
                  <p style={{ fontSize: '13px', color: '#991B1B' }}>{request.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Employee Info */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee Information</h3></div>
            <div className="tibbna-card-content">
              {employee ? (
                <div className="flex items-start gap-4">
                  <EmployeeAvatar name={`${employee.first_name} ${employee.last_name}`} size="lg" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1" style={{ fontSize: '13px' }}>
                    <div><span style={{ color: '#a3a3a3' }}>Name</span><p style={{ fontWeight: 600 }}>{employee.first_name} {employee.last_name}</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Employee #</span><p style={{ fontWeight: 500 }}>{employee.employee_number}</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Department</span><p style={{ fontWeight: 500 }}>{employee.department_name}</p></div>
                    <div><span style={{ color: '#a3a3a3' }}>Position</span><p style={{ fontWeight: 500 }}>{employee.job_title}</p></div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#a3a3a3' }}>Employee data not found</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Leave Balance */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Leave Balance</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {balance ? (
                <>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Annual</span><span style={{ fontWeight: 600 }}>{balance.annual?.available ?? '-'} / {balance.annual?.total ?? '-'}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Sick</span><span style={{ fontWeight: 600 }}>{balance.sick?.available ?? '-'} / {balance.sick?.total ?? '-'}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Emergency</span><span style={{ fontWeight: 600 }}>{balance.emergency?.available ?? '-'} / {balance.emergency?.total ?? '-'}</span></div>
                </>
              ) : (
                <p style={{ color: '#a3a3a3' }}>No balance data</p>
              )}
            </div>
          </div>

          {/* Leave Type Info */}
          {leaveType && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Leave Policy</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Max Days/Year</span><span style={{ fontWeight: 500 }}>{leaveType.max_days}</span></div>
                <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Max Consecutive</span><span style={{ fontWeight: 500 }}>{leaveType.max_consecutive}</span></div>
                <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Notice Required</span><span style={{ fontWeight: 500 }}>{leaveType.notice_days} days</span></div>
                <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Category</span><span style={{ fontWeight: 500 }}>{leaveType.category}</span></div>
                <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Docs Required</span><span style={{ fontWeight: 500 }}>{leaveType.requires_doc ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          )}

          {/* Approval History */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>History</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="flex items-start gap-2" style={{ fontSize: '12px' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#DBEAFE' }}><FileText size={12} style={{ color: '#3B82F6' }} /></div>
                <div><p style={{ fontWeight: 500 }}>Request submitted</p><p style={{ color: '#a3a3a3' }}>{request.submitted_at || 'Draft'}</p></div>
              </div>
              {request.approved_at && (
                <div className="flex items-start gap-2" style={{ fontSize: '12px' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={12} style={{ color: '#10B981' }} /></div>
                  <div><p style={{ fontWeight: 500 }}>Approved by {request.approver_name}</p><p style={{ color: '#a3a3a3' }}>{request.approved_at}</p></div>
                </div>
              )}
              {status === 'REJECTED' && (
                <div className="flex items-start gap-2" style={{ fontSize: '12px' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}><XCircle size={12} style={{ color: '#EF4444' }} /></div>
                  <div><p style={{ fontWeight: 500 }}>Rejected by {request.approver_name}</p><p style={{ color: '#a3a3a3' }}>{request.rejection_reason}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showAction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAction(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ border: '1px solid #e4e4e4' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e4e4e4' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Reject Leave Request</h3>
              </div>
              <div style={{ padding: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Rejection Reason *</label>
                <textarea className="tibbna-input" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Provide reason for rejection..." style={{ width: '100%' }} />
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid #e4e4e4', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => setShowAction(false)}>Cancel</button>
                <button className="btn-primary" style={{ backgroundColor: '#EF4444' }} onClick={handleReject} disabled={!comment.trim()}>Reject Request</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
