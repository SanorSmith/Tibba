'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Check, Circle, User, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employee_id: string; // Employee number like EMP-2024-001
  employee_number: string;
  first_name: string;
  last_name: string;
  full_name_arabic?: string;
  department_name?: string;
  job_title?: string;
  employment_status?: string;
  email_work?: string;
  phone_mobile?: string;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  max_days_per_year: number;
  color: string;
}

interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  available_balance: number;
  used: number;
  accrued: number;
}

export default function NewStaffLeaveRequestPage() {
  const router = useRouter();
  
  // Form state
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
    contact_number: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  
  // Employee search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  useEffect(() => {
    if (form.employee_id) {
      loadLeaveBalances(form.employee_id);
    }
  }, [form.employee_id]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search employees as user types
  useEffect(() => {
    const searchEmployees = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch('/api/hr/employees');
        const data = await response.json();
        if (data.success) {
          const filtered = data.data.filter((emp: Employee) => {
            const search = searchTerm.toLowerCase();
            
            // Check first name, middle name (if exists), last name separately
            const firstNameMatch = emp.first_name?.toLowerCase().includes(search);
            const lastNameMatch = emp.last_name?.toLowerCase().includes(search);
            const fullNameMatch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search);
            
            // Check employee ID (employee_id is the UUID, employee_number is the display ID)
            const employeeIdMatch = emp.employee_id?.toLowerCase().includes(search);
            const employeeNumberMatch = emp.employee_number?.toLowerCase().includes(search);
            
            // Check department
            const departmentMatch = emp.department_name?.toLowerCase().includes(search);
            
            // Check job title
            const jobTitleMatch = emp.job_title?.toLowerCase().includes(search);
            
            return (
              firstNameMatch ||
              lastNameMatch ||
              fullNameMatch ||
              employeeIdMatch ||
              employeeNumberMatch ||
              departmentMatch ||
              jobTitleMatch
            );
          });
          setSearchResults(filtered.slice(0, 20)); // Limit to 20 results
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Error searching employees:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setForm({ ...form, employee_id: employee.id });
    setSearchTerm(`${employee.first_name} ${employee.last_name}`);
    setShowSearchResults(false);
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployee(null);
    setForm({ ...form, employee_id: '' });
    setSearchTerm('');
    setLeaveBalances([]);
  };

  const loadLeaveTypes = async () => {
    try {
      const response = await fetch('/api/hr/leave-types');
      const data = await response.json();
      if (data.success) {
        setLeaveTypes(data.data);
      }
    } catch (error) {
      console.error('Error loading leave types:', error);
      toast.error('Failed to load leave types');
    }
  };

  const loadLeaveBalances = async (employeeId: string) => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`/api/hr/leaves/balances?employeeId=${employeeId}&year=${year}`);
      const data = await response.json();
      if (data.success) {
        setLeaveBalances(data.data);
      }
    } catch (error) {
      console.error('Error loading leave balances:', error);
      setLeaveBalances([]);
    }
  };

  const calculateWorkingDays = () => {
    if (!form.start_date || !form.end_date) return 0;
    
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    
    if (end < start) return 0;
    
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Not Friday or Saturday
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return form.is_half_day ? 0.5 : days;
  };

  const workingDays = calculateWorkingDays();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.employee_id) newErrors.employee_id = 'Employee is required';
    if (!form.leave_type_id) newErrors.leave_type_id = 'Leave type is required';
    if (!form.start_date) newErrors.start_date = 'Start date is required';
    if (!form.end_date) newErrors.end_date = 'End date is required';
    if (!form.reason?.trim()) newErrors.reason = 'Reason is required';

    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employee_id,
          leave_type_id: form.leave_type_id,
          start_date: form.start_date,
          end_date: form.end_date,
          days_count: workingDays,
          reason: form.reason,
          emergency_contact: form.contact_number,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Leave request submitted successfully!');
        router.push('/staff');
      } else {
        toast.error(data.error || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBalance = leaveBalances.find(b => b.leave_type_id === form.leave_type_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Leave Request</h1>
          <p className="text-gray-600 mt-1">Submit a leave request for an employee</p>
        </div>
      </div>

      <div className="tibbna-card">
        <div className="tibbna-card-content space-y-5">
          {/* Employee & Leave Type */}
          <div className="space-y-4">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e4' }}>
              Employee & Leave Type
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee Search */}
              <div className="flex flex-col gap-1.5" ref={searchRef}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Employee<span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="tibbna-input pl-10 pr-10"
                      placeholder="Search by first name, last name, or employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
                    />
                    {selectedEmployee && (
                      <button
                        onClick={clearEmployeeSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {showSearchResults && (
                    <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                      {searching ? (
                        <div className="px-4 py-3 text-center text-gray-500">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => handleEmployeeSelect(emp)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {emp.first_name} {emp.last_name}
                                </p>
                                <div className="flex gap-3 text-sm text-gray-600">
                                  <span>ID: {emp.employee_id}</span>
                                  <span>{emp.employee_number}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{emp.department_name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{emp.job_title || 'N/A'}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500">
                          {searchTerm.length < 2 ? 'Type at least 2 characters to search' : 'No employees found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.employee_id && (
                  <span className="text-xs text-red-500">{errors.employee_id}</span>
                )}
              </div>

              {/* Leave Type */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Leave Type<span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>
                </label>
                <select
                  className="tibbna-input"
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  disabled={!form.employee_id}
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code} — max {lt.max_days_per_year} days)
                    </option>
                  ))}
                </select>
                {errors.leave_type_id && (
                  <span className="text-xs text-red-500">{errors.leave_type_id}</span>
                )}
              </div>
            </div>

            {/* Balance Display */}
            {selectedBalance && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Available Balance:</span>
                  <span className="text-lg font-bold text-blue-600">{selectedBalance.available_balance} days</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                  <span>Used: {selectedBalance.used} days</span>
                  <span>Accrued: {selectedBalance.accrued} days</span>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e4' }}>
              Dates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Start Date<span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>
                </label>
                <input
                  className="tibbna-input"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
                {errors.start_date && (
                  <span className="text-xs text-red-500">{errors.start_date}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  End Date<span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>
                </label>
                <input
                  className="tibbna-input"
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
                {errors.end_date && (
                  <span className="text-xs text-red-500">{errors.end_date}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Duration</label>
                <div className="tibbna-input flex items-center gap-2" style={{ backgroundColor: '#F9FAFB', fontWeight: 600 }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: '#618FF5' }} />
                  {workingDays} working day(s)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="halfDay"
                type="checkbox"
                checked={form.is_half_day}
                onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                style={{ accentColor: '#618FF5' }}
              />
              <label htmlFor="halfDay" style={{ fontSize: '13px', color: '#525252' }}>
                Half-day leave
              </label>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e4' }}>
              Details
            </h3>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Reason<span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>
              </label>
              <textarea
                className="tibbna-input"
                placeholder="Provide reason for leave request..."
                maxLength={500}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
              <span style={{ fontSize: '11px', color: '#A3A3A3' }}>{form.reason.length}/500</span>
              {errors.reason && (
                <span className="text-xs text-red-500">{errors.reason}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Contact Number During Leave
                </label>
                <input
                  className="tibbna-input"
                  placeholder="+964-xxx-xxx-xxxx"
                  type="tel"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4" style={{ borderTop: '1px solid #e4e4e4' }}>
            <Link href="/staff">
              <button className="btn-secondary">Cancel</button>
            </Link>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
