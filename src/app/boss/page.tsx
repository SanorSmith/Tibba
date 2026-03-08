'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings,
  FileText,
  Activity
} from 'lucide-react';

interface BossStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingApprovals: number;
  upcomingShifts: number;
  systemAlerts: number;
}

export default function BossDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BossStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeaveToday: 0,
    pendingApprovals: 0,
    upcomingShifts: 0,
    systemAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadBossStats();
  }, []);

  const loadBossStats = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get total employees
      const empResponse = await fetch('/api/hr/employees');
      const empData = await empResponse.json();
      
      // Get today's attendance
      const attendanceResponse = await fetch(`/api/hr/attendance?date=${today}`);
      const attendanceData = await attendanceResponse.json();
      
      // Get pending approvals for this manager
      const approvalResponse = await fetch('/api/hr/leaves/approvals?approver_id=' + (user?.id || '00000000-0000-0000-0000-000000000001'));
      const approvalData = await approvalResponse.json();
      
      // Get system alerts (notifications)
      try {
        const notificationsResponse = await fetch('/api/notifications?unread=true');
        const notificationsData = await notificationsResponse.json();
        
        const totalEmployees = empData.success ? empData.data.length : 0;
        const attendanceRecords = attendanceData.success ? attendanceData.data : [];
        const pendingApprovals = approvalData.success ? approvalData.data.length : 0;
        const systemAlerts = notificationsData.success ? notificationsData.data.length : 0;
        
        // Calculate accurate metrics
        const activeToday = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
        const onLeaveToday = attendanceRecords.filter((a: any) => a.status === 'LEAVE').length;
        const upcomingShifts = 0; // Could be enhanced with shift scheduling data
        
        setStats({
          totalEmployees,
          activeEmployees: activeToday,
          onLeaveToday,
          pendingApprovals,
          upcomingShifts,
          systemAlerts
        });
        
      } catch (notificationError) {
        // Fallback if notifications API doesn't exist
        const totalEmployees = empData.success ? empData.data.length : 0;
        const attendanceRecords = attendanceData.success ? attendanceData.data : [];
        const pendingApprovals = approvalData.success ? approvalData.data.length : 0;
        
        const activeToday = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
        const onLeaveToday = attendanceRecords.filter((a: any) => a.status === 'LEAVE').length;
        
        setStats({
          totalEmployees,
          activeEmployees: activeToday,
          onLeaveToday,
          pendingApprovals,
          upcomingShifts: 0,
          systemAlerts: 0
        });
      }
      
    } catch (error) {
      console.error('Error loading boss stats:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Boss Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of all hospital operations • Last updated: {lastUpdated.toLocaleTimeString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadBossStats}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>
              Refresh
            </button>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {user?.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Leave Today</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.onLeaveToday}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingApprovals}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Shifts</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.upcomingShifts}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.systemAlerts}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Employee Management</h3>
                </div>
                <Link href="/staff">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">All Employees</span>
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <Link href="/hr/leaves">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Leave Management</span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Operations</h3>
                </div>
                <Link href="/hr/attendance">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Attendance</span>
                      <Activity className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <Link href="/hr/schedules">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Schedules</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
                <Link href="/hr/leaves/analytics">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Analytics</span>
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Reports</h3>
                </div>
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Report</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Weekly Report</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monthly Report</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Today's Staff Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Active</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.activeEmployees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">On Leave</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">{stats.onLeaveToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium">Inactive</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">{stats.totalEmployees - stats.activeEmployees}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Items</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.pendingApprovals > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">Leave Approvals</p>
                          <p className="text-sm text-yellow-600">Need your review</p>
                        </div>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        {stats.pendingApprovals}
                      </span>
                    </div>
                  </div>
                )}
                
                {stats.systemAlerts > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">System Alerts</p>
                          <p className="text-sm text-red-600">Need attention</p>
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        {stats.systemAlerts}
                      </span>
                    </div>
                  </div>
                )}
                
                {stats.pendingApprovals === 0 && stats.systemAlerts === 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">All Clear</p>
                        <p className="text-sm text-green-600">No pending items</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/staff">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Staff Management
              </button>
            </Link>
            <Link href="/hr/leaves/approvals">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Review Approvals
              </button>
            </Link>
            <Link href="/hr/attendance">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Attendance
              </button>
            </Link>
            <Link href="/hr/leaves/analytics">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </Link>
            <Link href="/hr/leaves/admin">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Admin Panel
              </button>
            </Link>
          </div>
        </div>
      </div>
  );
}
