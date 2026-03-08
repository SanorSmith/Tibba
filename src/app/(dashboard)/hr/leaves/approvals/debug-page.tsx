'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle } from 'lucide-react';

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

export default function DebugApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Try to get user info from localStorage or session
    const getUserInfo = () => {
      try {
        // Check if we have any session data
        const sessionData = localStorage.getItem('tibbna_session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          console.log('Found session data:', parsed);
          setUserInfo(parsed);
          return parsed;
        }
      } catch (e) {
        console.log('No session data found');
      }
      
      // Fallback - create mock user for testing
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Test Manager',
        role: 'HR_ADMIN',
        email: 'test@hospital.com'
      };
      setUserInfo(mockUser);
      return mockUser;
    };

    const user = getUserInfo();
    loadPendingApprovals(user);
  }, []);

  const loadPendingApprovals = async (user: any) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading approvals for user:', user?.id);
      
      const response = await fetch(`/api/hr/leaves/approvals?approver_id=${user?.id || '00000000-0000-0000-0000-000000000001'}`);
      const result = await response.json();

      console.log('API Response:', result);

      if (result.success) {
        setApprovals(result.data || []);
      } else {
        setError(result.error || 'Failed to load approvals');
      }
    } catch (error: any) {
      console.error('Error loading approvals:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Approvals</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Approvals (Debug)</h1>
          <p className="text-gray-600 mt-1">
            Debug version - User: {userInfo?.name} (ID: {userInfo?.id})
          </p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-2xl font-bold text-blue-600">{approvals.length}</span>
          <span className="text-gray-600 ml-2">Pending</span>
        </div>
      </div>

      {userInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Current User Info:</h3>
          <pre className="text-sm text-gray-600 overflow-x-auto">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">You have no pending leave approvals at this time.</p>
          
          <div className="mt-6 text-left">
            <h4 className="font-semibold text-gray-900 mb-2">Debug Info:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• API endpoint: /api/hr/leaves/approvals?approver_id={userInfo?.id}</li>
              <li>• Response status: Check browser console</li>
              <li>• User role: {userInfo?.role}</li>
              <li>• Can approve: {userInfo?.role === 'HR_ADMIN' || userInfo?.role === 'Administrator' ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.approval_id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
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
                      <p className="font-medium text-gray-900">{formatDate(approval.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">End Date</p>
                      <p className="font-medium text-gray-900">{formatDate(approval.end_date)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
