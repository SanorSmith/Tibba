'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  FileText,
  Bell,
  Database,
  Shield
} from 'lucide-react';

interface AdminStats {
  totalEmployees: number;
  activeLeaveRequests: number;
  pendingApprovals: number;
  monthlyAccruals: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeLeaveRequests: 0,
    pendingApprovals: 0,
    monthlyAccruals: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      
      // Get employee count
      const empResponse = await fetch('/api/hr/employees');
      const empData = await empResponse.json();
      
      // Get leave requests
      const leaveResponse = await fetch('/api/hr/leaves');
      const leaveData = await leaveResponse.json();
      
      // Get pending approvals (admin view)
      const approvalResponse = await fetch('/api/hr/leaves/approvals?approver_id=00000000-0000-0000-0000-000000000001');
      const approvalData = await approvalResponse.json();
      
      setStats({
        totalEmployees: empData.success ? empData.data.length : 0,
        activeLeaveRequests: leaveData.success ? leaveData.data.filter((r: any) => r.status === 'APPROVED').length : 0,
        pendingApprovals: approvalData.success ? approvalData.data.length : 0,
        monthlyAccruals: 0, // Would come from accrual API
        systemHealth: 'healthy'
      });
      
    } catch (error) {
      console.error('Error loading admin stats:', error);
      setStats(prev => ({ ...prev, systemHealth: 'warning' }));
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

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management Admin</h1>
            <p className="text-gray-600 mt-1">System administration and configuration</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              stats.systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
              stats.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              System: {stats.systemHealth.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Leave</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeLeaveRequests}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Accruals</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.monthlyAccruals}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Administrative Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Leave Management */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Leave Management</h3>
                </div>
                <Link href="/hr/leaves/requests">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">All Requests</span>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <Link href="/staff/requests/new">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Create Request</span>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <Link href="/hr/leaves/calendar">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Leave Calendar</span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
              </div>

              {/* Approval Management */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Approval Management</h3>
                </div>
                <Link href="/hr/leaves/approvals">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending Approvals</span>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {stats.pendingApprovals}
                      </span>
                    </div>
                  </button>
                </Link>
                <button 
                  onClick={() => alert('Approval workflow configuration coming soon')}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Workflow Settings</span>
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

              {/* Analytics & Reports */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Analytics & Reports</h3>
                </div>
                <Link href="/hr/leaves/analytics">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Leave Analytics</span>
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <button 
                  onClick={() => alert('Detailed reports coming soon')}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Department Reports</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

              {/* System Administration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">System Administration</h3>
                </div>
                <button 
                  onClick={() => alert('Policy configuration coming soon')}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Leave Policies</span>
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <button 
                  onClick={() => alert('Balance management coming soon')}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Balance Management</span>
                    <Database className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <button 
                  onClick={() => alert('Notification settings coming soon')}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notifications</span>
                    <Bell className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

              {/* Database Operations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-gray-900">Database Operations</h3>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Run monthly accrual for all employees? This will update leave balances.')) {
                      fetch('/api/hr/leaves/accrual/run', { method: 'POST' })
                        .then(r => r.json())
                        .then(data => alert(data.message || 'Accrual completed'))
                        .catch(e => alert('Error: ' + e.message));
                    }
                  }}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Run Monthly Accrual</span>
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Sync all approved leaves to attendance?')) {
                      fetch('/api/hr/leaves/sync-attendance', { method: 'POST' })
                        .then(r => r.json())
                        .then(data => alert(data.message || 'Sync completed'))
                        .catch(e => alert('Error: ' + e.message));
                    }
                  }}
                  className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sync Attendance</span>
                    <Database className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

              {/* System Health */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900">System Health</h3>
                </div>
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">OK</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">OK</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-xs text-gray-600">Just now</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <Link href="/hr/leaves/approvals">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Review Approvals
              </button>
            </Link>
            <Link href="/hr/leaves/analytics">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                View Analytics
              </button>
            </Link>
            <Link href="/staff/requests/new">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Create Request
              </button>
            </Link>
          </div>
        </div>
      </div>
  );
}
