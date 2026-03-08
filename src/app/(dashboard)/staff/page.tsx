'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Save,
  X,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  employee_id?: string;
  employee_number?: string;
  department_name?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  specialty?: string;
  // Computed name field
  name: string;
}

interface LeaveBalance {
  id?: string;
  leave_type_id?: string;
  leave_type_name: string;
  leave_type_code?: string;
  leave_type_color?: string;
  year?: number;
  opening_balance: number;
  accrued: number;
  used: number;
  pending?: number;
  available_balance: number;
  // Legacy fields for display
  leave_type?: string;
  total_days?: number;
  used_days?: number;
  remaining_days?: number;
}

interface LeaveRequest {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  working_days_count: number;
  status: string;
  reason: string;
  created_at: string;
}

interface AttendanceRecord {
  date: string;
  dayName: string;
  transactions: Array<{
    id: string;
    transaction_type: string;
    time: string;
    device_type: string;
    source: string;
    timestamp: string;
  }>;
  summary: {
    totalTransactions: number;
    checkIns: number;
    checkOuts: number;
    firstIn: string | null;
    lastOut: string | null;
  };
}

export default function StaffPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaves' | 'attendance' | 'profile'>('overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<EmployeeProfile>>({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  
  // Employee search and selection
  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);

  useEffect(() => {
    loadAllEmployees();
    // Only load employee data if user ID exists
    if (user?.id) {
      loadEmployeeData();
    }
  }, [user?.id]);

  const loadAllEmployees = async () => {
    try {
      const employeesRes = await fetch('/api/hr/employees');
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        if (employeesData.success && employeesData.data) {
          // Map staff data to EmployeeProfile format
          const mappedEmployees = employeesData.data.map((emp: any) => ({
            id: emp.id,
            first_name: emp.first_name,
            middle_name: emp.middle_name,
            last_name: emp.last_name,
            employee_id: emp.employee_id,
            employee_number: emp.employee_number,
            department_name: emp.department_name,
            job_title: emp.job_title,
            email: emp.email,
            phone: emp.phone,
            created_at: emp.created_at,
            specialty: emp.specialty,
            name: `${emp.first_name} ${emp.last_name}`
          }));
          setAllEmployees(mappedEmployees);
        }
      } else {
        setAllEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setAllEmployees([]);
    }
  };

  const handleEmployeeSelect = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setShowEmployeeSearch(false);
    setSearchTerm('');
    loadEmployeeDataForEmployee(employee.id);
  };

  const loadEmployeeDataForEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      
      const employee = allEmployees.find(emp => emp.id === employeeId);
      if (employee) {
        setProfile(employee);
        setEditedProfile(employee);
      }
      
      try {
        const year = new Date().getFullYear();
        const balancesRes = await fetch(`/api/hr/leaves/balances?employeeId=${employeeId}&year=${year}`);
        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          if (balancesData.success && balancesData.data) {
            // Transform database format to display format
            const transformedBalances = balancesData.data.map((bal: any) => ({
              ...bal,
              leave_type: bal.leave_type_name,
              total_days: bal.opening_balance + bal.accrued,
              used_days: bal.used || 0,
              remaining_days: bal.available_balance || 0
            }));
            setLeaveBalances(transformedBalances);
          } else {
            setLeaveBalances([]);
          }
        } else {
          setLeaveBalances([]);
        }
      } catch (err) {
        console.error('Error loading balances:', err);
        setLeaveBalances([]);
      }
      
      try {
        const requestsRes = await fetch(`/api/hr/leaves?employee_id=${employeeId}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          if (requestsData.success && requestsData.data) {
            setLeaveRequests(requestsData.data);
          }
        }
      } catch (err) {
        setLeaveRequests([]);
      }
      
      try {
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const attendanceRes = await fetch(`/api/hr/attendance/records?staffId=${employeeId}&year=${currentYear}&month=${currentMonth}`);
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (attendanceData.success && attendanceData.data) {
            setAttendanceRecords(attendanceData.data.records);
            setAttendanceSummary(attendanceData.data.summary);
          }
        }
      } catch (err) {
        setAttendanceRecords([]);
        setAttendanceSummary(null);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async () => {
    // Don't load if user ID is not available
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const mockProfile: EmployeeProfile = {
        id: user.id,
        name: user.name || 'User',
        employee_number: 'EMP-' + user.id.substring(0, 8),
        department: 'Administration',
        position: user.role || 'Employee',
        email: user.email || '',
        phone: '+1234567890',
        join_date: '2024-01-01',
        status: 'ACTIVE'
      };
      
      try {
        const profileRes = await fetch(`/api/hr/employees/${user.id}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.success && profileData.data) {
            setProfile(profileData.data);
            setEditedProfile(profileData.data);
          } else {
            setProfile(mockProfile);
            setEditedProfile(mockProfile);
          }
        } else {
          setProfile(mockProfile);
          setEditedProfile(mockProfile);
        }
      } catch (err) {
        setProfile(mockProfile);
        setEditedProfile(mockProfile);
      }
      
      try {
        const year = new Date().getFullYear();
        const balancesRes = await fetch(`/api/hr/leaves/balances?employeeId=${user.id}&year=${year}`);
        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          if (balancesData.success && balancesData.data) {
            // Transform database format to display format
            const transformedBalances = balancesData.data.map((bal: any) => ({
              ...bal,
              leave_type: bal.leave_type_name,
              total_days: bal.opening_balance + bal.accrued,
              used_days: bal.used || 0,
              remaining_days: bal.available_balance || 0
            }));
            setLeaveBalances(transformedBalances);
          } else {
            setLeaveBalances([]);
          }
        } else {
          setLeaveBalances([]);
        }
      } catch (err) {
        console.error('Error loading balances:', err);
        setLeaveBalances([]);
      }
      
      try {
        const requestsRes = await fetch(`/api/hr/leaves?employee_id=${user.id}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          if (requestsData.success && requestsData.data) {
            setLeaveRequests(requestsData.data);
          }
        }
      } catch (err) {
        setLeaveRequests([]);
      }
      
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const attendanceRes = await fetch(`/api/hr/attendance?employee_id=${user.id}&start_date=${startDate}&end_date=${endDate}`);
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (attendanceData.success && attendanceData.data) {
            setAttendanceRecords(attendanceData.data);
          }
        }
      } catch (err) {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const targetEmployeeId = selectedEmployee?.id || user?.id;
      const response = await fetch(`/api/hr/employees/${targetEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProfile)
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
        setEditingProfile(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match');
      return;
    }
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current,
          new_password: passwordData.new
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Password changed successfully!');
        setShowPasswordChange(false);
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
  };

  const handleDeleteLeaveRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;
    try {
      const response = await fetch(`/api/hr/leaves/${requestId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setLeaveRequests(leaveRequests.filter(r => r.id !== requestId));
        alert('Leave request deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting leave request:', error);
      alert('Failed to delete leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateMonthlyTotalHours = (records: AttendanceRecord[]) => {
    let totalMinutes = 0;
    
    records.forEach(record => {
      if (record.summary.firstIn && record.summary.lastOut) {
        const inTime = new Date(`${record.date} ${record.summary.firstIn}`);
        const outTime = new Date(`${record.date} ${record.summary.lastOut}`);
        const diffMs = outTime.getTime() - inTime.getTime();
        totalMinutes += diffMs / (1000 * 60);
      }
    });
    
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = Math.floor(totalMinutes % 60);
    
    return `${totalHours}h ${remainingMins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Portal</h1>
          <p className="text-gray-600 mt-1">
            {selectedEmployee ? `Viewing: ${selectedEmployee.name}` : `Welcome, ${profile?.name || 'User'}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* New Leave Request Button */}
          <Link href="/staff/requests/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Leave Request
            </button>
          </Link>
          
          {/* Employee Search */}
          <div className="relative">
            <button
              onClick={() => setShowEmployeeSearch(!showEmployeeSearch)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              {selectedEmployee ? selectedEmployee.name : 'Select Employee'}
            </button>
            
            {showEmployeeSearch && (
              <div className="absolute top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search by first name, last name, or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {allEmployees
                    .filter(emp => {
                      const search = searchTerm.toLowerCase();
                      const firstNameMatch = emp.first_name?.toLowerCase().includes(search);
                      const lastNameMatch = emp.last_name?.toLowerCase().includes(search);
                      const fullNameMatch = emp.name?.toLowerCase().includes(search);
                      const employeeIdMatch = emp.employee_id?.toLowerCase().includes(search);
                      const employeeNumberMatch = emp.employee_number?.toLowerCase().includes(search);
                      
                      return firstNameMatch || lastNameMatch || fullNameMatch || employeeIdMatch || employeeNumberMatch;
                    })
                    .map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => handleEmployeeSelect(employee)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <div className="flex gap-3 text-sm text-gray-600">
                              <span>ID: {employee.employee_id || 'N/A'}</span>
                              <span>{employee.employee_number || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{employee.department_name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{employee.job_title || 'N/A'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {allEmployees.filter(emp => {
                      const search = searchTerm.toLowerCase();
                      const firstNameMatch = emp.first_name?.toLowerCase().includes(search);
                      const lastNameMatch = emp.last_name?.toLowerCase().includes(search);
                      const fullNameMatch = emp.name?.toLowerCase().includes(search);
                      const employeeIdMatch = emp.employee_id?.toLowerCase().includes(search);
                      const employeeNumberMatch = emp.employee_number?.toLowerCase().includes(search);
                      
                      return firstNameMatch || lastNameMatch || fullNameMatch || employeeIdMatch || employeeNumberMatch;
                    }).length === 0 && (
                    <div className="px-4 py-3 text-center text-gray-500">
                      No employees found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'leaves'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Leaves
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile & Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Leave Balances */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leaveBalances.map((balance, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">{balance.leave_type}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{balance.remaining_days}</p>
                          <p className="text-xs text-gray-500">days remaining</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Used: {balance.used_days}/{balance.total_days}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leaveBalances.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      No leave balances available
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link href="/staff/requests/new">
                    <button className="w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
                      <Plus className="w-5 h-5 text-blue-600 mb-2" />
                      <p className="font-medium text-gray-900">Request Leave</p>
                      <p className="text-xs text-gray-600 mt-1">Submit new leave request</p>
                    </button>
                  </Link>
                  <button
                    onClick={() => setActiveTab('leaves')}
                    className="w-full p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <Eye className="w-5 h-5 text-green-600 mb-2" />
                    <p className="font-medium text-gray-900">View Requests</p>
                    <p className="text-xs text-gray-600 mt-1">Check request status</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="w-full p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                  >
                    <Clock className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="font-medium text-gray-900">My Attendance</p>
                    <p className="text-xs text-gray-600 mt-1">View attendance records</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                  >
                    <Settings className="w-5 h-5 text-orange-600 mb-2" />
                    <p className="font-medium text-gray-900">Settings</p>
                    <p className="text-xs text-gray-600 mt-1">Update profile & password</p>
                  </button>
                </div>
              </div>

              {/* Recent Leave Requests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Leave Requests</h3>
                <div className="space-y-3">
                  {leaveRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{request.leave_type_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          <span className="ml-2">({request.working_days_count} days)</span>
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </div>
                    </div>
                  ))}
                  {leaveRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No leave requests yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">My Leave Requests</h3>
                <Link href="/staff/requests/new">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Request
                  </button>
                </Link>
              </div>
              <div className="space-y-3">
                {leaveRequests.map((request) => (
                  <div key={request.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{request.leave_type_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{request.reason}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </div>
                        {request.status === 'PENDING' && (
                          <button
                            onClick={() => handleDeleteLeaveRequest(request.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{request.working_days_count} working days</span>
                      <span className="text-gray-500">Requested {new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No leave requests found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">My Attendance Records</h3>
              
              {/* Table Header */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                  <div>Date</div>
                  <div>Day</div>
                  <div>Check In</div>
                  <div>Check Out</div>
                  <div>Duration</div>
                </div>
              </div>

              {/* Daily Records */}
              <div className="space-y-2">
                {attendanceRecords.map((record, idx) => {
                  // Calculate duration between first IN and last OUT
                  let duration = 'N/A';
                  if (record.summary.firstIn && record.summary.lastOut) {
                    const inTime = new Date(`${record.date} ${record.summary.firstIn}`);
                    const outTime = new Date(`${record.date} ${record.summary.lastOut}`);
                    const diffMs = outTime.getTime() - inTime.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${diffHours}h ${diffMins}m`;
                  }

                  return (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-gray-600">{record.dayName.slice(0, 3)}</div>
                        <div className="text-green-600 font-medium">
                          {record.summary.firstIn || '--:--'}
                        </div>
                        <div className="text-blue-600 font-medium">
                          {record.summary.lastOut || '--:--'}
                        </div>
                        <div className="text-gray-700 font-medium">
                          {duration}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {attendanceRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-white border border-gray-200 rounded-lg">
                    No attendance records found
                  </div>
                )}
              </div>

              {/* Monthly Summary */}
              {attendanceSummary && attendanceRecords.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Monthly Summary</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-600 font-medium">Total Days</div>
                      <div className="text-blue-900 font-bold text-lg">{attendanceSummary.totalDays}</div>
                    </div>
                    <div>
                      <div className="text-blue-600 font-medium">Check-ins</div>
                      <div className="text-blue-900 font-bold text-lg">{attendanceSummary.totalCheckIns}</div>
                    </div>
                    <div>
                      <div className="text-blue-600 font-medium">Check-outs</div>
                      <div className="text-blue-900 font-bold text-lg">{attendanceSummary.totalCheckOuts}</div>
                    </div>
                    <div>
                      <div className="text-blue-600 font-medium">Total Hours</div>
                      <div className="text-blue-900 font-bold text-lg">
                        {calculateMonthlyTotalHours(attendanceRecords)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {!editingProfile ? (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setEditedProfile(profile || {});
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingProfile ? editedProfile.name : profile?.name || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                    <input
                      type="text"
                      value={profile?.employee_number || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingProfile ? editedProfile.email : profile?.email || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingProfile ? editedProfile.phone : profile?.phone || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={profile?.department || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={profile?.position || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                  {!showPasswordChange && (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Change Password
                    </button>
                  )}
                </div>
                
                {showPasswordChange && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Update Password
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordData({ current: '', new: '', confirm: '' });
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
