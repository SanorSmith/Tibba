'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, TrendingUp, Users, Calendar, Clock, Award } from 'lucide-react';

interface AnalyticsData {
  period: {
    start_date: string;
    end_date: string;
    department: string;
  };
  summary: {
    total_requests: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    total_days_approved: number;
    avg_days_per_request: string;
  };
  by_type: Array<{
    leave_type: string;
    leave_type_code: string;
    request_count: number;
    total_days: number;
    approved_count: number;
  }>;
  by_department: Array<{
    department: string;
    request_count: number;
    total_days: number;
    approved_count: number;
    unique_employees: number;
  }>;
  monthly_trend: Array<{
    month: string;
    request_count: number;
    total_days: number;
    approved_count: number;
  }>;
  top_employees: Array<{
    employee_id: string;
    employee_name: string;
    department: string;
    request_count: number;
    total_days: number;
    approved_count: number;
  }>;
  approver_stats: Array<{
    approver: string;
    total_reviewed: number;
    approved_count: number;
    rejected_count: number;
    approval_rate: number;
  }>;
  processing_time: {
    avg_hours: string;
    min_hours: string;
    max_hours: string;
  };
}

function AnalyticsPageContent() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: `${new Date().getFullYear()}-01-01`,
    end_date: `${new Date().getFullYear()}-12-31`,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });

      const response = await fetch(`/api/hr/leaves/analytics?${params}`);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
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
          <h1 className="text-2xl font-bold text-gray-900">Leave Analytics</h1>
          <p className="text-gray-600 mt-1">Insights and trends for leave management</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Requests</h3>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.summary.total_requests}</p>
          <p className="text-sm text-gray-600 mt-1">
            {analytics.summary.approved} approved, {analytics.summary.rejected} rejected
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Days</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {analytics.summary.total_days_approved.toFixed(0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Avg: {analytics.summary.avg_days_per_request} days/request
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.summary.pending}</p>
          <p className="text-sm text-gray-600 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Processing</h3>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {parseFloat(analytics.processing_time.avg_hours).toFixed(1)}h
          </p>
          <p className="text-sm text-gray-600 mt-1">Average approval time</p>
        </div>
      </div>

      {/* Leave by Type */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Leave Requests by Type
        </h3>
        <div className="space-y-3">
          {analytics.by_type.map((type) => {
            const percentage = (type.approved_count / type.request_count) * 100;
            return (
              <div key={type.leave_type_code}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{type.leave_type}</span>
                  <span className="text-sm text-gray-600">
                    {type.request_count} requests ({type.total_days} days)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}% approved</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Leave by Department
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Department</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total Days</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Employees</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.by_department.map((dept) => {
                const approvalRate = (dept.approved_count / dept.request_count) * 100;
                return (
                  <tr key={dept.department} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{dept.department}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{dept.request_count}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{dept.total_days}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{dept.unique_employees}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {approvalRate.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Employees */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Employees by Leave Days</h3>
        <div className="space-y-3">
          {analytics.top_employees.slice(0, 5).map((emp, index) => (
            <div key={emp.employee_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{emp.employee_name}</p>
                  <p className="text-sm text-gray-600">{emp.department}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{emp.total_days} days</p>
                <p className="text-sm text-gray-600">{emp.request_count} requests</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
        <div className="space-y-2">
          {analytics.monthly_trend.map((month) => (
            <div key={month.month} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 w-20">{month.month}</span>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(month.total_days / 100) * 10}%`, minWidth: '40px' }}
                  >
                    <span className="text-xs text-white font-medium">{month.total_days}</span>
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-600 w-24 text-right">
                {month.request_count} requests
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsPageContent />;
}
