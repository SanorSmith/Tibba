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
  name: string;
  employee_number: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  join_date: string;
  status: string;
}

interface LeaveBalance {
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
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
  check_in: string;
  check_out: string;
  status: string;
  hours_worked: number;
}

export default function EmployeePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
    // Always load data, even if user is not available yet (will use mock data)
    loadEmployeeData();
    loadAllEmployees();
  }, [user?.id]);

  const loadAllEmployees = async () => {
    try {
      // Load all employees for search functionality
      const employeesRes = await fetch('/api/hr/employees');
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        if (employeesData.success && employeesData.data) {
          setAllEmployees(employeesData.data);
        }
      } else {
        // Mock employees data
        const mockEmployees: EmployeeProfile[] = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Super Admin',
            employee_number: 'EMP-ADMIN-001',
            department: 'Administration',
            position: 'Administrator',
            email: 'admin@hospital.com',
            phone: '+1234567890',
            join_date: '2024-01-01',
            status: 'ACTIVE'
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            name: 'Dr. Sarah Johnson',
            employee_number: 'EMP-DOC-001',
            department: 'Medical',
            position: 'Doctor',
            email: 'sarah.johnson@hospital.com',
            phone: '+1234567891',
            join_date: '2024-01-15',
            status: 'ACTIVE'
          },
          {
            id: '323e4567-e89b-12d3-a456-426614174002',
            name: 'John Smith',
            employee_number: 'EMP-ENG-001',
            department: 'Engineering',
            position: 'Software Developer',
            email: 'john.smith@hospital.com',
            phone: '+1234567892',
            join_date: '2024-02-01',
            status: 'ACTIVE'
          },
          {
            id: '423e4567-e89b-12d3-a456-426614174003',
            name: 'Mary Davis',
            employee_number: 'EMP-NURSE-001',
            department: 'Nursing',
            position: 'Registered Nurse',
            email: 'mary.davis@hospital.com',
            phone: '+1234567893',
            join_date: '2024-01-20',
            status: 'ACTIVE'
          }
        ];
        setAllEmployees(mockEmployees);
      }
    } catch (error) {
      console.error('Error loading all employees:', error);
    }
  };

  const handleEmployeeSelect = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setShowEmployeeSearch(false);
    setSearchTerm('');
    // Load data for selected employee
    loadEmployeeDataForEmployee(employee.id);
  };

  const loadEmployeeDataForEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      
      // Find employee in allEmployees list
      const employee = allEmployees.find(emp => emp.id === employeeId);
      if (employee) {
        setProfile(employee);
        setEditedProfile(employee);
      }
      
      // Load leave balances for selected employee
      try {
        const balancesRes = await fetch(`/api/hr/leaves/balances?employee_id=${employeeId}`);
        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          if (balancesData.success && balancesData.data) {
            setLeaveBalances(balancesData.data);
          }
        }
      } catch (err) {
        console.log('No leave balances available');
        setLeaveBalances([
          { leave_type: 'Annual Leave', total_days: 30, used_days: 5, remaining_days: 25 },
          { leave_type: 'Sick Leave', total_days: 15, used_days: 2, remaining_days: 13 },
          { leave_type: 'Emergency Leave', total_days: 5, used_days: 0, remaining_days: 5 }
        ]);
      }
      
      // Load leave requests for selected employee
      try {
        const requestsRes = await fetch(`/api/hr/leaves?employee_id=${employeeId}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          if (requestsData.success && requestsData.data) {
            setLeaveRequests(requestsData.data);
          }
        }
      } catch (err) {
        console.log('No leave requests available');
        setLeaveRequests([]);
      }
      
      // Load attendance records for selected employee
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const attendanceRes = await fetch(`/api/hr/attendance?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`);
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (attendanceData.success && attendanceData.data) {
            setAttendanceRecords(attendanceData.data);
          }
        }
      } catch (err) {
        console.log('No attendance records available');
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Use logged-in user data from session
      const mockProfile: EmployeeProfile = {
        id: user?.id || '123e4567-e89b-12d3-a456-426614174000',
        name: user?.name || 'Super Admin',
        employee_number: 'EMP-' + (user?.id?.substring(0, 8) || 'ADMIN-001'),
        department: 'Administration',
        position: user?.role || 'Administrator',
        email: user?.email || 'admin@hospital.com',
        phone: '+1234567890',
        join_date: '2024-01-01',
        status: 'ACTIVE'
      };
      
      // Load employee profile with fallback
      try {
        const profileRes = await fetch(`/api/hr/employees/${user?.id}`);
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
        console.log('Using mock profile data');
        setProfile(mockProfile);
        setEditedProfile(mockProfile);
      }
      
      // Load leave balances with fallback
      try {
        const balancesRes = await fetch(`/api/hr/leaves/balances?employee_id=${user?.id}`);
        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          if (balancesData.success && balancesData.data) {
            setLeaveBalances(balancesData.data);
          }
        }
      } catch (err) {
        console.log('No leave balances available');
        setLeaveBalances([
          { leave_type: 'Annual Leave', total_days: 30, used_days: 5, remaining_days: 25 },
          { leave_type: 'Sick Leave', total_days: 15, used_days: 2, remaining_days: 13 },
          { leave_type: 'Emergency Leave', total_days: 5, used_days: 0, remaining_days: 5 }
        ]);
      }
      
      // Load leave requests with fallback
      try {
        const requestsRes = await fetch(`/api/hr/leaves?employee_id=${user?.id}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          if (requestsData.success && requestsData.data) {
            setLeaveRequests(requestsData.data);
          }
        }
      } catch (err) {
        console.log('No leave requests available');
        setLeaveRequests([]);
      }
      
      // Load attendance records with fallback
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const attendanceRes = await fetch(`/api/hr/attendance?employee_id=${user?.id}&start_date=${startDate}&end_date=${endDate}`);
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (attendanceData.success && attendanceData.data) {
            setAttendanceRecords(attendanceData.data);
          }
        }
      } catch (err) {
        console.log('No attendance records available');
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
    const colors: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      LATE: 'bg-orange-100 text-orange-800',
      LEAVE: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Unable to load employee profile</p>
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
            {selectedEmployee ? `Viewing: ${selectedEmployee.name}` : `Welcome, ${profile.name}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
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
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {allEmployees
                    .filter(emp => 
                      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => handleEmployeeSelect(employee)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{employee.employee_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{employee.department}</p>
                            <p className="text-xs text-gray-500">{employee.position}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {allEmployees.filter(emp => 
                    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-3 text-center text-gray-500">
                      No employees found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {selectedEmployee ? selectedEmployee.employee_number : profile.employee_number}
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
              <div className="space-y-3">
                {attendanceRecords.map((record, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">
                        {record.check_in && `In: ${record.check_in}`}
                        {record.check_out && ` | Out: ${record.check_out}`}
                        {record.hours_worked && ` | ${record.hours_worked}h`}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </div>
                  </div>
                ))}
                {attendanceRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No attendance records found
                  </div>
                )}
              </div>
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
                          setEditedProfile(profile);
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
                      value={editingProfile ? editedProfile.name : profile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                    <input
                      type="text"
                      value={profile.employee_number}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingProfile ? editedProfile.email : profile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingProfile ? editedProfile.phone : profile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      disabled={!editingProfile}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={profile.department}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={profile.position}
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
