'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Calendar,
  Clock,
  TriangleAlert,
  FileText,
  ChartColumn,
  Settings,
  Plus,
  CheckSquare,
  Scale,
} from 'lucide-react';

export default function LeavesPage() {
  const [stats, setStats] = useState({
    totalEmployees: 10,
    activeToday: 0,
    onLeaveToday: 0,
    pendingApprovals: 1,
    upcomingShifts: 0,
    systemAlerts: 0
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage employee leave requests, approvals and balances</p>
        </div>
        <Link href="/hr/leaves/requests">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Leave Request
          </button>
        </Link>
      </div>

      {/* Quick section links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/hr/leaves/requests">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 text-sm">Leave Requests</p>
                <p className="text-xs text-blue-600">Submit &amp; view requests</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/leaves/approvals">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 text-sm">Approvals</p>
                <p className="text-xs text-amber-600">{stats.pendingApprovals} pending review</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/leaves/balances">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 hover:bg-emerald-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Scale className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Balances</p>
                <p className="text-xs text-emerald-600">View leave balances</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/leaves/calendar">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-purple-900 text-sm">Calendar</p>
                <p className="text-xs text-purple-600">Team leave calendar</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
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
              <p className="text-2xl font-bold text-green-600">{stats.activeToday}</p>
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
              <TriangleAlert className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{stats.pendingApprovals}</span>
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
                    <ChartColumn className="w-4 h-4 text-gray-400" />
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

      {/* Status Overview */}
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
                <span className="text-lg font-bold text-green-600">{stats.activeToday}</span>
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
                <span className="text-lg font-bold text-gray-600">{stats.totalEmployees - stats.activeToday - stats.onLeaveToday}</span>
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
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Leave Approvals</p>
                      <p className="text-sm text-yellow-600">Need your review</p>
                    </div>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">{stats.pendingApprovals}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="flex gap-3 flex-wrap">
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
              <ChartColumn className="w-4 h-4" />
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
