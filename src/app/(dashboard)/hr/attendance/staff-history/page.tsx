'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Download, Filter, Search, User } from 'lucide-react';
import { toast } from 'sonner';

interface StaffAttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  date: string;
  first_in: string | null;
  last_out: string | null;
  total_hours: number;
  status: string;
  current_status?: string;
}

export default function StaffAttendanceHistoryPage() {
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

  useEffect(() => {
    loadAttendanceRecords();
  }, [viewMode, startDate, endDate]);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      let url = '/api/hr/attendance/staff';
      
      if (viewMode === 'today') {
        url += '?today=true';
      } else {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += '?' + params.toString();
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
      } else {
        throw new Error(result.error || 'Failed to load attendance records');
      }
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.employee_name?.toLowerCase().includes(search) ||
      record.employee_number?.toLowerCase().includes(search)
    );
  });

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string, currentStatus?: string) => {
    if (viewMode === 'today' && currentStatus) {
      const colors = {
        'NOT_CHECKED_IN': 'bg-gray-100 text-gray-800',
        'CHECKED_IN': 'bg-green-100 text-green-800',
        'CHECKED_OUT': 'bg-blue-100 text-blue-800',
      };
      const labels = {
        'NOT_CHECKED_IN': 'Not Checked In',
        'CHECKED_IN': 'Checked In',
        'CHECKED_OUT': 'Checked Out',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[currentStatus as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
          {labels[currentStatus as keyof typeof labels] || currentStatus}
        </span>
      );
    }

    const colors = {
      'PRESENT': 'bg-green-100 text-green-800',
      'ABSENT': 'bg-red-100 text-red-800',
      'LEAVE': 'bg-yellow-100 text-yellow-800',
      'HOLIDAY': 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee Name', 'Employee Number', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const rows = filteredRecords.map(record => [
      record.date,
      record.employee_name,
      record.employee_number,
      formatTime(record.first_in),
      formatTime(record.last_out),
      record.total_hours?.toFixed(2) || '0',
      record.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Attendance data exported successfully');
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr/attendance">
              <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
            </Link>
            <div>
              <h2 className="page-title">Staff Attendance History</h2>
              <p className="page-description">View and manage staff attendance records</p>
            </div>
          </div>
          <button onClick={exportToCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tibbna-card mb-4">
        <div className="tibbna-card-content">
          <div className="flex flex-col md:flex-row gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                History
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or employee number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range (only for history mode) */}
            {viewMode === 'history' && (
              <>
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={loadAttendanceRecords}
                  className="btn-primary flex items-center gap-2"
                >
                  <Filter size={16} />
                  Apply
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-content p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.employee_number || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Clock className="w-4 h-4 text-green-600" />
                          {formatTime(record.first_in)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {formatTime(record.last_out)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.total_hours ? `${record.total_hours.toFixed(2)} hrs` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status, record.current_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {viewMode === 'today' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <p className="text-sm text-gray-600">Checked In</p>
              <p className="text-2xl font-bold text-green-600">
                {records.filter(r => r.current_status === 'CHECKED_IN' || r.current_status === 'CHECKED_OUT').length}
              </p>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <p className="text-sm text-gray-600">Not Checked In</p>
              <p className="text-2xl font-bold text-gray-600">
                {records.filter(r => r.current_status === 'NOT_CHECKED_IN').length}
              </p>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <p className="text-sm text-gray-600">Checked Out</p>
              <p className="text-2xl font-bold text-blue-600">
                {records.filter(r => r.current_status === 'CHECKED_OUT').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
