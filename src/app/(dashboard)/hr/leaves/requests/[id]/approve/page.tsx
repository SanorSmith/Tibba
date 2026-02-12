'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock, User,
  FileText, Calendar, Briefcase, Shield
} from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeaveRequest, Employee } from '@/types/hr';

// Balance key lookup by leave type name
const BALANCE_KEY_MAP: Record<string, string> = {
  'Annual Leave': 'annual',
  'Sick Leave': 'sick',
  'Emergency Leave': 'emergency',
  'Maternity Leave': 'maternity',
  'Paternity Leave': 'paternity',
  'Unpaid Leave': 'unpaid',
  'Hajj Leave': 'hajj',
  'Study Leave': 'study',
  'Compensatory Leave': 'compensatory',
};

interface ApprovalStep {
  number: number;
  title: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  name?: string;
  date?: string;
  remarks?: string;
}

export default function LeaveApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, hasRole } = useAuth();

  const requestId = params.id as string;
  const suggestedAction = searchParams.get('action');

  // =========================================================================
  // STATE
  // =========================================================================
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [action, setAction] = useState<'approve' | 'reject'>(
    suggestedAction === 'reject' ? 'reject' : 'approve'
  );
  const [remarks, setRemarks] = useState('');

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      const req = dataStore.getLeaveRequest(requestId);
      if (!req) {
        toast.error('Leave request not found');
        router.push('/hr/leaves/requests');
        return;
      }
      const emp = dataStore.getEmployee(req.employee_id);
      if (!emp) {
        toast.error('Employee not found');
        router.push('/hr/leaves/requests');
        return;
      }
      const bal = dataStore.getRawLeaveBalance(req.employee_id);
      setRequest(req);
      setEmployee(emp);
      setBalance(bal);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [requestId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // APPROVAL LOGIC
  // =========================================================================
  const determineCurrentStep = (): number => {
    if (!request) return 0;
    if (!request.approver_1_status || request.approver_1_status === 'PENDING') return 1;
    if (!request.approver_2_status || request.approver_2_status === 'PENDING') return 2;
    if (request.total_days > 14) {
      if (!request.approver_3_status || request.approver_3_status === 'PENDING') return 3;
    }
    return 0; // All approved
  };

  const canCurrentUserApprove = (): boolean => {
    const step = determineCurrentStep();
    if (step === 0) return false;
    if (step === 1 && hasRole(['MANAGER', 'Doctor', 'Administrator'])) return true;
    if (step === 2 && hasRole(['HR_ADMIN', 'Administrator'])) return true;
    if (step === 3 && hasRole(['Administrator'])) return true;
    return false;
  };

  const getApprovalSteps = (): ApprovalStep[] => {
    if (!request) return [];
    const steps: ApprovalStep[] = [
      {
        number: 1,
        title: 'Department Manager',
        status: request.approver_1_status || 'PENDING',
        name: request.approver_1_name,
        date: request.approver_1_date,
        remarks: request.approver_1_remarks,
      },
      {
        number: 2,
        title: 'HR Manager',
        status: request.approver_2_status || 'PENDING',
        name: request.approver_2_name,
        date: request.approver_2_date,
        remarks: request.approver_2_remarks,
      },
    ];
    if (request.total_days > 14) {
      steps.push({
        number: 3,
        title: 'CEO',
        status: request.approver_3_status || 'PENDING',
        name: request.approver_3_name,
        date: request.approver_3_date,
        remarks: request.approver_3_remarks,
      });
    }
    return steps;
  };

  // =========================================================================
  // SUBMIT
  // =========================================================================
  const handleSubmit = async () => {
    if (!request || !canCurrentUserApprove()) {
      toast.error('You do not have permission to approve at this step');
      return;
    }
    if (action === 'reject' && !remarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const step = determineCurrentStep();
      const approverName = user?.name || 'System';
      const timestamp = new Date().toISOString();
      const balKey = BALANCE_KEY_MAP[request.leave_type];

      if (action === 'approve') {
        const updates: Partial<LeaveRequest> = { last_updated_at: timestamp };

        if (step === 1) {
          updates.approver_1_status = 'APPROVED';
          updates.approver_1_name = approverName;
          updates.approver_1_date = timestamp;
          if (remarks.trim()) updates.approver_1_remarks = remarks.trim();
        } else if (step === 2) {
          updates.approver_2_status = 'APPROVED';
          updates.approver_2_name = approverName;
          updates.approver_2_date = timestamp;
          if (remarks.trim()) updates.approver_2_remarks = remarks.trim();
        } else if (step === 3) {
          updates.approver_3_status = 'APPROVED';
          updates.approver_3_name = approverName;
          updates.approver_3_date = timestamp;
          if (remarks.trim()) updates.approver_3_remarks = remarks.trim();
        }

        const isFinal =
          (request.total_days <= 14 && step === 2) ||
          (request.total_days > 14 && step === 3);

        if (isFinal) {
          updates.status = 'APPROVED';
          updates.approved_at = timestamp.split('T')[0];

          // Move balance: pending → taken
          if (balKey && balance?.[balKey]) {
            dataStore.updateLeaveBalanceByType(request.employee_id, balKey, {
              pending: Math.max(0, (balance[balKey].pending || 0) - request.total_days),
              used: (balance[balKey].used || balance[balKey].taken || 0) + request.total_days,
            });
          }

          // ✨ TRIGGER INTEGRATION: Create attendance records for leave period
          try {
            const { integrationManager } = await import('@/lib/integrationManager');
            const intResult = await integrationManager.onLeaveApproved(requestId);
            if (intResult.success && intResult.recordsCreated > 0) {
              console.log(`✅ Created ${intResult.recordsCreated} attendance records for leave`);
            }
          } catch (intError) {
            console.error('Integration error:', intError);
          }
        }

        const ok = dataStore.updateLeaveRequest(requestId, updates);
        if (!ok) { toast.error('Failed to update request'); return; }

        toast.success(
          isFinal ? 'Leave request fully approved!' : 'Approval step completed!',
          { description: isFinal ? '✨ Attendance records created automatically for leave period' : 'Request moved to next approval level', duration: 4000 }
        );
        setTimeout(() => router.push('/hr/leaves/requests'), 1200);

      } else {
        // REJECT
        const updates: Partial<LeaveRequest> = {
          status: 'REJECTED',
          rejection_reason: remarks.trim(),
          rejected_by: approverName,
          rejected_at: timestamp,
          last_updated_at: timestamp,
        };

        if (step === 1) {
          updates.approver_1_status = 'REJECTED';
          updates.approver_1_name = approverName;
          updates.approver_1_date = timestamp;
          updates.approver_1_remarks = remarks.trim();
        } else if (step === 2) {
          updates.approver_2_status = 'REJECTED';
          updates.approver_2_name = approverName;
          updates.approver_2_date = timestamp;
          updates.approver_2_remarks = remarks.trim();
        } else if (step === 3) {
          updates.approver_3_status = 'REJECTED';
          updates.approver_3_name = approverName;
          updates.approver_3_date = timestamp;
          updates.approver_3_remarks = remarks.trim();
        }

        const ok = dataStore.updateLeaveRequest(requestId, updates);
        if (!ok) { toast.error('Failed to reject request'); return; }

        // Restore balance: pending → available
        if (balKey && balance?.[balKey]) {
          dataStore.updateLeaveBalanceByType(request.employee_id, balKey, {
            pending: Math.max(0, (balance[balKey].pending || 0) - request.total_days),
            available: (balance[balKey].available || 0) + request.total_days,
          });
        }

        toast.success('Leave request rejected', { description: 'Employee has been notified', duration: 4000 });
        setTimeout(() => router.push('/hr/leaves/requests'), 1200);
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Error processing request');
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================================
  // HELPERS
  // =========================================================================
  const fmtDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // =========================================================================
  // RENDER — Loading
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading request…</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Not found
  // =========================================================================
  if (!request || !employee) {
    return (
      <>
        <div className="page-header-section">
          <div className="flex items-center gap-3">
            <Link href="/hr/leaves/requests"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
            <h2 className="page-title">Request Not Found</h2>
          </div>
        </div>
        <div className="tibbna-card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
          <p style={{ fontSize: '14px', color: '#525252' }}>This leave request could not be found.</p>
        </div>
      </>
    );
  }

  // =========================================================================
  // RENDER — Already processed
  // =========================================================================
  if (request.status !== 'PENDING_APPROVAL') {
    return (
      <>
        <div className="page-header-section">
          <div className="flex items-center gap-3">
            <Link href="/hr/leaves/requests"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
            <div>
              <h2 className="page-title">Request Already Processed</h2>
              <p className="page-description">{request.request_number || request.id}</p>
            </div>
          </div>
        </div>
        <div className="tibbna-card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 12px', color: '#F59E0B' }} />
          <p style={{ fontSize: '14px', color: '#525252', marginBottom: '8px' }}>This request is no longer pending approval.</p>
          <SmartStatusBadge status={request.status} />
          <div style={{ marginTop: '20px' }}>
            <Link href="/hr/leaves/requests"><button className="btn-primary">Back to Requests</button></Link>
          </div>
        </div>
      </>
    );
  }

  // =========================================================================
  // DERIVED
  // =========================================================================
  const currentStep = determineCurrentStep();
  const canApprove = canCurrentUserApprove();
  const approvalSteps = getApprovalSteps();
  const balKey = BALANCE_KEY_MAP[request.leave_type];
  const currentBalance = balKey && balance?.[balKey] ? balance[balKey].available : 0;
  const hasEnoughBalance = currentBalance >= request.total_days || request.leave_type === 'Unpaid Leave';

  // =========================================================================
  // RENDER — Main
  // =========================================================================
  return (
    <>
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves/requests"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Review Leave Request</h2>
            <p className="page-description">{request.request_number || request.id}</p>
          </div>
        </div>
        <SmartStatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 tibbna-section">
        {/* =============================================================== */}
        {/* LEFT COLUMN — Details                                           */}
        {/* =============================================================== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Employee Info */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-card-title flex items-center gap-2"><User size={15} /> Employee Information</h3>
            </div>
            <div className="tibbna-card-content">
              <div className="flex items-center gap-4">
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#618FF5', flexShrink: 0 }}>
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>{employee.first_name} {employee.last_name}</p>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>{employee.job_title}</p>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{employee.department_name} • {employee.employee_number}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Details */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-card-title flex items-center gap-2"><FileText size={15} /> Leave Details</h3>
            </div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Leave Type</span>
                  <p style={{ fontWeight: 500 }}>{request.leave_type}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Duration</span>
                  <p style={{ fontWeight: 600, color: '#1D4ED8' }}>
                    {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                    {request.is_half_day ? ' (Half-day)' : ''}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Submitted</span>
                  <p style={{ fontWeight: 500 }}>{fmtDateTime(request.submitted_at)}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Start Date</span>
                  <p style={{ fontWeight: 500 }}>{fmtDate(request.start_date)}</p>
                </div>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>End Date</span>
                  <p style={{ fontWeight: 500 }}>{fmtDate(request.end_date)}</p>
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginTop: '16px' }}>
                <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Reason</span>
                <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>{request.reason}</p>
              </div>

              {/* Supporting doc */}
              {request.supporting_document && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Supporting Document</span>
                  <p style={{ fontSize: '12px', fontWeight: 500, marginTop: '2px', color: '#618FF5' }}>{request.supporting_document}</p>
                </div>
              )}
            </div>
          </div>

          {/* Balance Check */}
          {balKey && balance?.[balKey] && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              border: `1px solid ${hasEnoughBalance ? '#BBF7D0' : '#FECACA'}`,
              backgroundColor: hasEnoughBalance ? '#F0FDF4' : '#FEF2F2',
            }}>
              <div className="flex items-start gap-3">
                {hasEnoughBalance ? (
                  <CheckCircle size={18} style={{ color: '#16A34A', marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: '#DC2626', marginTop: '2px', flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: hasEnoughBalance ? '#14532D' : '#7F1D1D' }}>
                    {hasEnoughBalance ? 'Sufficient Balance' : 'Insufficient Balance'}
                  </p>
                  <p style={{ fontSize: '12px', color: hasEnoughBalance ? '#166534' : '#991B1B', marginTop: '2px' }}>
                    Available: <strong>{currentBalance} days</strong> &nbsp;|&nbsp; Requested: <strong>{request.total_days} days</strong>
                    {!hasEnoughBalance && <><br />Remaining after approval: <strong style={{ color: '#DC2626' }}>{currentBalance - request.total_days} days</strong></>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Approval Timeline */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-card-title flex items-center gap-2"><Shield size={15} /> Approval Timeline</h3>
            </div>
            <div className="tibbna-card-content">
              <div className="space-y-3">
                {/* Submitted step (always complete) */}
                <div className="flex items-start gap-3" style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={15} style={{ color: '#16A34A' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#14532D' }}>Submitted by Employee</p>
                    <p style={{ fontSize: '11px', color: '#166534' }}>{fmtDateTime(request.submitted_at)}</p>
                  </div>
                </div>

                {/* Approval steps */}
                {approvalSteps.map((step) => {
                  const isCurrent = step.number === currentStep;
                  const isApproved = step.status === 'APPROVED';
                  const isRejected = step.status === 'REJECTED';
                  const isPending = step.status === 'PENDING';

                  const bg = isApproved ? '#F0FDF4' : isRejected ? '#FEF2F2' : isCurrent ? '#EFF6FF' : '#F9FAFB';
                  const border = isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : isCurrent ? '#BFDBFE' : '#E5E7EB';
                  const iconBg = isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : isCurrent ? '#DBEAFE' : '#F3F4F6';

                  return (
                    <div key={step.number} className="flex items-start gap-3" style={{ padding: '12px', borderRadius: '8px', backgroundColor: bg, border: `1px solid ${border}` }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isApproved ? <CheckCircle size={15} style={{ color: '#16A34A' }} /> :
                         isRejected ? <XCircle size={15} style={{ color: '#DC2626' }} /> :
                         isCurrent ? <Clock size={15} style={{ color: '#2563EB' }} /> :
                         <User size={15} style={{ color: '#6B7280' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center justify-between">
                          <p style={{ fontSize: '12px', fontWeight: 600, color: isApproved ? '#14532D' : isRejected ? '#7F1D1D' : isCurrent ? '#1E3A8A' : '#374151' }}>
                            Step {step.number}: {step.title}
                          </p>
                          {isCurrent && (
                            <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#618FF5', color: 'white', borderRadius: '10px', fontWeight: 600 }}>
                              Current Step
                            </span>
                          )}
                        </div>
                        {step.name && (
                          <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Actioned'} by: {step.name}
                          </p>
                        )}
                        {step.date && (
                          <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{fmtDateTime(step.date)}</p>
                        )}
                        {step.remarks && (
                          <div style={{ marginTop: '6px', padding: '6px 10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '11px', color: '#374151' }}>
                            {step.remarks}
                          </div>
                        )}
                        {isPending && !step.name && (
                          <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>Pending approval</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT COLUMN — Action Panel                                     */}
        {/* =============================================================== */}
        <div className="lg:col-span-1">
          <div className="tibbna-card" style={{ position: 'sticky', top: '24px' }}>
            <div className="tibbna-card-header">
              <h3 className="tibbna-card-title flex items-center gap-2"><Briefcase size={15} /> Your Action</h3>
            </div>
            <div className="tibbna-card-content">
              {!canApprove ? (
                <div style={{ padding: '16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                  <AlertTriangle size={20} style={{ color: '#D97706', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#92400E' }}>
                    You are not the current approver for this request.
                  </p>
                  <p style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                    Step {currentStep} requires a different role.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Decision toggle */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>Decision</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAction('approve')}
                        style={{
                          padding: '12px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${action === 'approve' ? '#16A34A' : '#D1D5DB'}`,
                          backgroundColor: action === 'approve' ? '#F0FDF4' : 'white',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <CheckCircle size={20} style={{ margin: '0 auto 4px', color: action === 'approve' ? '#16A34A' : '#9CA3AF' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: action === 'approve' ? '#14532D' : '#6B7280' }}>Approve</span>
                      </button>
                      <button
                        onClick={() => setAction('reject')}
                        style={{
                          padding: '12px 8px',
                          borderRadius: '8px',
                          border: `2px solid ${action === 'reject' ? '#DC2626' : '#D1D5DB'}`,
                          backgroundColor: action === 'reject' ? '#FEF2F2' : 'white',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <XCircle size={20} style={{ margin: '0 auto 4px', color: action === 'reject' ? '#DC2626' : '#9CA3AF' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: action === 'reject' ? '#7F1D1D' : '#6B7280' }}>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Remarks {action === 'reject' && <span style={{ color: '#EF4444' }}>*</span>}
                    </label>
                    <textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      rows={4}
                      placeholder={action === 'approve' ? 'Optional comments…' : 'Please provide a reason for rejection…'}
                      className="tibbna-input"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  {/* Insufficient balance warning */}
                  {action === 'approve' && !hasEnoughBalance && request.leave_type !== 'Unpaid Leave' && (
                    <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                        Warning: Employee has insufficient balance ({currentBalance} available, {request.total_days} requested).
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={processing || (action === 'reject' && !remarks.trim())}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: action === 'approve' ? '#16A34A' : '#DC2626',
                      opacity: (processing || (action === 'reject' && !remarks.trim())) ? 0.5 : 1,
                    }}
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Processing…
                      </>
                    ) : (
                      <>
                        {action === 'approve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {action === 'approve' ? 'Approve Request' : 'Reject Request'}
                      </>
                    )}
                  </button>

                  {/* Info */}
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
                    {action === 'approve' ? (
                      currentStep === 2 && request.total_days <= 14
                        ? 'This is the final approval step'
                        : currentStep === 3
                          ? 'This is the final approval step (CEO)'
                          : `Step ${currentStep} of ${request.total_days > 14 ? 3 : 2}`
                    ) : (
                      'Rejection will restore the employee\'s pending balance'
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
