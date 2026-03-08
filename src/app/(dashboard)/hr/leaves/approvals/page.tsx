'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
// Using native notifications - toast library can be added later if needed
import { Calendar, Clock, User, CheckCircle, XCircle, Send } from 'lucide-react';

interface PendingApproval {
  approval_id: string;
  leave_request_id: string;
  approval_level: number;
  level_name: string;
  assigned_at: string;
  due_date: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  leave_type_code: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  working_days_count: number;
  reason: string;
  created_at: string;
}

function ApprovalsPageContent() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load approvals immediately, with fallback if user auth fails
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/leaves/approvals?approver_id=${user?.id || '00000000-0000-0000-0000-000000000001'}`);
      const result = await response.json();

      if (result.success) {
        setApprovals(result.data);
      } else {
        console.error('Failed to load pending approvals');
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setModalAction('approve');
    setShowModal(true);
  };

  const handleReject = async (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setModalAction('reject');
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedApproval || !user) return;

    try {
      setProcessing(true);

      const endpoint = modalAction === 'approve' ? 'approve' : 'reject';
      const body = modalAction === 'approve'
        ? {
            approver_id: user.id,
            approver_name: user.name,
            comments,
          }
        : {
            approver_id: user.id,
            approver_name: user.name,
            rejection_reason: rejectionReason,
          };

      const response = await fetch(
        `/api/hr/leaves/approvals/${selectedApproval.leave_request_id}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log(result.message || `Leave request ${modalAction}d successfully`);
        alert(result.message || `Leave request ${modalAction}d successfully`);
        setShowModal(false);
        setComments('');
        setRejectionReason('');
        loadPendingApprovals();
      } else {
        console.error(result.error || `Failed to ${modalAction} leave request`);
        alert(result.error || `Failed to ${modalAction} leave request`);
      }
    } catch (error) {
      console.error(`Error ${modalAction}ing leave:`, error);
      alert(`Failed to ${modalAction} leave request`);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-600 mt-1">Review and approve pending leave requests</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-2xl font-bold text-blue-600">{approvals.length}</span>
          <span className="text-gray-600 ml-2">Pending</span>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">You have no pending leave approvals at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const daysUntilDue = getDaysUntilDue(approval.due_date);
            const isUrgent = daysUntilDue <= 1;

            return (
              <div
                key={approval.approval_id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  isUrgent ? 'border-red-500' : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{approval.employee_name}</h3>
                        <p className="text-sm text-gray-600">{approval.employee_number}</p>
                      </div>
                      {isUrgent && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          URGENT
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Leave Type</p>
                        <p className="font-medium text-gray-900">{approval.leave_type_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="font-medium text-gray-900">{approval.working_days_count} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Start Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="font-medium text-gray-900">{formatDate(approval.start_date)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">End Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="font-medium text-gray-900">{formatDate(approval.end_date)}</p>
                        </div>
                      </div>
                    </div>

                    {approval.reason && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Reason</p>
                        <p className="text-gray-900">{approval.reason}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        <span>{approval.level_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(approval)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Employee</p>
              <p className="font-medium">{selectedApproval.employee_name}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Leave Type</p>
              <p className="font-medium">{selectedApproval.leave_type_name}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Duration</p>
              <p className="font-medium">
                {formatDate(selectedApproval.start_date)} - {formatDate(selectedApproval.end_date)} (
                {selectedApproval.working_days_count} days)
              </p>
            </div>

            {modalAction === 'approve' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any comments..."
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setComments('');
                  setRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={processing || (modalAction === 'reject' && !rejectionReason)}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : modalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return <ApprovalsPageContent />;
}
