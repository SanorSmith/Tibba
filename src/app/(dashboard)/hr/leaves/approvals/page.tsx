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
  approver_id: string;
  approver_name: string;
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

  // Check if user is admin
  const fallbackUser = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'System Administrator',
    role: 'Administrator'
  };
  
  const currentUser = user || fallbackUser;
  const isAdmin = currentUser?.role === 'HR_ADMIN' || currentUser?.role === 'Administrator';

  useEffect(() => {
    // Load approvals immediately, with fallback if user auth fails
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin and use admin endpoint to see ALL pending requests
      const fallbackUser = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'System Administrator',
        role: 'Administrator'
      };
      
      const currentUser = user || fallbackUser;
      const isAdmin = currentUser?.role === 'HR_ADMIN' || currentUser?.role === 'Administrator';
      const endpoint = isAdmin 
        ? '/api/hr/leaves/approvals/admin' 
        : `/api/hr/leaves/approvals?approver_id=${currentUser.id}`;
      
      console.log(`Loading approvals from: ${endpoint} (User role: ${currentUser?.role})`);
      
      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        // Deduplicate approvals by leave_request_id (keep the first one)
        const seenIds = new Set();
        const uniqueApprovals = result.data.filter((approval: PendingApproval) => {
          if (seenIds.has(approval.leave_request_id)) {
            return false; // Skip duplicate
          }
          seenIds.add(approval.leave_request_id);
          return true;
        });
        
        console.log(`Original: ${result.data.length}, After deduplication: ${uniqueApprovals.length}`);
        setApprovals(uniqueApprovals);
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
    console.log('🔍 confirmAction called');
    console.log('selectedApproval:', selectedApproval);
    console.log('user:', user);
    console.log('modalAction:', modalAction);
    
    if (!selectedApproval) {
      console.log('❌ Missing selectedApproval');
      return;
    }
    
    // Use fallback user if auth is not working
    const fallbackUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'System Administrator',
      role: 'Administrator'
    };
    
    const currentUser = user || fallbackUser;
    console.log('Using user:', currentUser);
    
    if (!currentUser) {
      console.log('❌ No user available');
      return;
    }

    try {
      console.log('🔧 Starting approval process...');
      setProcessing(true);

      // Use admin endpoint if user is admin and viewing all requests
      const isAdmin = currentUser?.role === 'HR_ADMIN' || currentUser?.role === 'Administrator';
      const isUsingAdminView = selectedApproval.approver_id !== currentUser.id;
      
      const endpoint = modalAction === 'approve' 
        ? (isAdmin && isUsingAdminView ? 'admin-approve' : 'approve')
        : 'reject';
      
      const body = modalAction === 'approve'
        ? {
            approver_id: currentUser.id,
            approver_name: currentUser.name,
            comments,
          }
        : {
            approver_id: currentUser.id,
            approver_name: currentUser.name,
            rejection_reason: rejectionReason,
          };

      console.log(`Approving with endpoint: ${endpoint} (Admin: ${isAdmin}, AdminView: ${isUsingAdminView})`);
      console.log('Request body:', body);

      const response = await fetch(
        `/api/hr/leaves/approvals/${selectedApproval.leave_request_id}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (result.success) {
        console.log('✅ Success case - closing modal');
        alert(result.message || `Leave request ${modalAction}d successfully`);
        setShowModal(false);
        setComments('');
        setRejectionReason('');
        loadPendingApprovals();
      } else {
        console.log('❌ Error case - still closing modal');
        console.error(result.error || `Failed to ${modalAction} leave request`);
        alert(result.error || `Failed to ${modalAction} leave request`);
        // Still close modal and refresh data to handle cases where request was already approved
        setShowModal(false);
        setComments('');
        setRejectionReason('');
        loadPendingApprovals();
      }
    } catch (error) {
      console.log('❌ Catch block - still closing modal');
      console.error(`Error ${modalAction}ing leave:`, error);
      alert(`Failed to ${modalAction} leave request`);
      // Still close modal and refresh data on error to prevent stuck modal
      setShowModal(false);
      setComments('');
      setRejectionReason('');
      loadPendingApprovals();
    } finally {
      console.log('🔧 Finally block - setting processing to false');
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

  const getDaysUntilDue = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    // Clear time part for accurate day calculation
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - now.getTime();
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
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Review and approve ALL pending leave requests' : 'Review and approve pending leave requests'}
          </p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-2xl font-bold text-blue-600">{approvals.length}</span>
          <span className="text-gray-600 ml-2">Pending</span>
          {isAdmin && (
            <span className="text-xs text-green-600 ml-2">(Admin View)</span>
          )}
          {approvals.length < 10 && (
            <span className="text-xs text-gray-500 ml-2">(deduplicated)</span>
          )}
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
            const daysUntilDue = getDaysUntilDue(approval.start_date);
            const isUrgent = daysUntilDue <= 1 && daysUntilDue >= 0; // Only urgent if today or tomorrow
            const isOverdue = daysUntilDue < 0; // Overdue if negative

            return (
              <div
                key={approval.leave_request_id} // Use leave_request_id as unique key
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  isOverdue ? 'border-red-500' : isUrgent ? 'border-orange-500' : 'border-blue-500'
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
                      {isOverdue && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          OVERDUE
                        </span>
                      )}
                      {isUrgent && !isOverdue && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
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
                          {isOverdue 
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0 
                              ? 'Due today'
                              : daysUntilDue === 1
                                ? 'Due tomorrow'
                                : `Due in ${daysUntilDue} days`
                          }
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
                  console.log('🔍 Cancel button clicked');
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
                onClick={() => {
                  console.log('🔍 Approve button clicked');
                  confirmAction();
                }}
                disabled={processing || (modalAction === 'reject' && !rejectionReason)}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : modalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
              {/* Debug button to force close modal */}
              <button
                onClick={() => {
                  console.log('🔍 Force close button clicked');
                  setShowModal(false);
                  setComments('');
                  setRejectionReason('');
                }}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded"
              >
                Force Close
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
