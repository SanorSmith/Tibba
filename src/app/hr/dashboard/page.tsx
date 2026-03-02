'use client';

/**
 * HR Dashboard with Real-Time KPIs
 * Displays system-wide metrics with SWR for real-time updates
 */

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface DashboardMetrics {
  totalActiveEmployees: number;
  todayAttendanceRate: number;
  pendingLeaveRequests: number;
  upcomingLicenseExpiries: number;
  currentMonthPayrollStatus: string;
  recentAlerts: number;
  attendanceTrend: Array<{ date: string; rate: number }>;
  departmentHeadcount: Array<{ department: string; count: number }>;
  overtimeByWeek: Array<{ week: string; hours: number }>;
}

export default function HRDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch dashboard metrics with SWR (revalidate every 5 minutes)
  const { data: metrics, error, isLoading } = useSWR<DashboardMetrics>(
    '/api/hr/dashboard/metrics',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load dashboard metrics</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time system overview • Last updated: {currentTime.toLocaleTimeString()}
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          Live
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Active Employees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalActiveEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total workforce
            </p>
          </CardContent>
        </Card>

        {/* Today's Attendance Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.todayAttendanceRate ? `${metrics.todayAttendanceRate.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.todayAttendanceRate && metrics.todayAttendanceRate >= 95 ? (
                <span className="text-green-600">Excellent attendance</span>
              ) : metrics?.todayAttendanceRate && metrics.todayAttendanceRate >= 85 ? (
                <span className="text-yellow-600">Good attendance</span>
              ) : (
                <span className="text-red-600">Low attendance</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingLeaveRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leave requests awaiting approval
            </p>
          </CardContent>
        </Card>

        {/* Upcoming License Expiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Expiries</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.upcomingLicenseExpiries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Expiring in next 30 days
            </p>
          </CardContent>
        </Card>

        {/* Current Month Payroll Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Status</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {metrics?.currentMonthPayrollStatus || 'Not Started'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month status
            </p>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.recentAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unread notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              {metrics?.attendanceTrend && metrics.attendanceTrend.length > 0 ? (
                <div className="w-full">
                  <div className="flex items-end justify-between h-48 gap-1">
                    {metrics.attendanceTrend.slice(-30).map((day, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t"
                        style={{ height: `${day.rate}%` }}
                        title={`${day.date}: ${day.rate}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              ) : (
                'No attendance data available'
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Headcount */}
        <Card>
          <CardHeader>
            <CardTitle>Department Headcount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.departmentHeadcount && metrics.departmentHeadcount.length > 0 ? (
                metrics.departmentHeadcount.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.department}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(dept.count / (metrics.totalActiveEmployees || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{dept.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No department data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overtime by Week */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Hours by Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between gap-4">
            {metrics?.overtimeByWeek && metrics.overtimeByWeek.length > 0 ? (
              metrics.overtimeByWeek.map((week, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-orange-500 rounded-t"
                    style={{ height: `${(week.hours / 100) * 100}%`, minHeight: '4px' }}
                    title={`${week.week}: ${week.hours}h`}
                  />
                  <span className="text-xs text-gray-600 mt-2">{week.week}</span>
                  <span className="text-xs font-medium">{week.hours}h</span>
                </div>
              ))
            ) : (
              <p className="w-full text-center text-gray-500">No overtime data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm font-medium">View Employees</div>
              </div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm font-medium">Attendance</div>
              </div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-sm font-medium">Run Payroll</div>
              </div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium">Reports</div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
