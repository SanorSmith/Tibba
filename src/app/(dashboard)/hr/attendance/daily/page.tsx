'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Users, UserCheck, UserX, Clock,
  CalendarDays, AlertTriangle, Filter, LogIn, LogOut,
} from 'lucide-react';
import type { Employee, AttendanceTransaction, LeaveRequest } from '@/types/hr';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';

// Helper type for daily attendance record
interface DailyAttendanceRecord {
  employee: Employee;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE';
  checkIn?: string;   // HH:MM:SS
  checkOut?: string;   // HH:MM:SS
  totalHours?: number;
  isLate: boolean;
  isEarlyDeparture: boolean;
  overtime?: number;
  leaveType?: string;
}

// Work time thresholds
const WORK_START = '08:30:00';
const WORK_END   = '16:30:00';
const STANDARD_HOURS = 8;

export default function DailySummaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<AttendanceTransaction[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // =========================================================================
  // LOAD DATA
  // =========================================================================

  useEffect(() => {
    try {
      const emps = dataStore.getEmployees().filter(
        (e) => (e as any).employment_status === 'ACTIVE'
      );
      const txns = dataStore.getAttendanceTransactions();
      const leaves = dataStore.getLeaveRequests();

      setEmployees(emps);
      setTransactions(txns);
      setLeaveRequests(leaves);
    } catch (error) {
      console.error('Error loading daily summary data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================================
  // HELPERS
  // =========================================================================

  const getEmployeeTransactions = (employeeId: string, date: string) =>
    transactions
      .filter((t) => t.employee_id === employeeId && t.transaction_date === date)
      .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));

  const isOnLeave = (employeeId: string, date: string): { onLeave: boolean; leaveType?: string } => {
    const approved = leaveRequests.find(
      (lr) =>
        lr.employee_id === employeeId &&
        lr.status === 'APPROVED' &&
        date >= lr.start_date &&
        date <= lr.end_date
    );
    return { onLeave: !!approved, leaveType: approved?.leave_type };
  };

  const calcHours = (startTime: string, endTime: string): number => {
    const [sh, sm, ss] = startTime.split(':').map(Number);
    const [eh, em, es] = endTime.split(':').map(Number);
    return (eh * 3600 + em * 60 + (es || 0) - (sh * 3600 + sm * 60 + (ss || 0))) / 3600;
  };

  // =========================================================================
  // BUILD DAILY RECORDS
  // =========================================================================

  const dailyRecords = useMemo((): DailyAttendanceRecord[] => {
    return employees.map((emp) => {
      const empTxns = getEmployeeTransactions(emp.id, selectedDate);
      const leave = isOnLeave(emp.id, selectedDate);

      if (leave.onLeave) {
        return { employee: emp, status: 'ON_LEAVE' as const, isLate: false, isEarlyDeparture: false, leaveType: leave.leaveType };
      }

      const checkIns = empTxns.filter((t) => t.transaction_type === 'CHECK_IN');
      const checkOuts = empTxns.filter((t) => t.transaction_type === 'CHECK_OUT');

      if (checkIns.length === 0) {
        return { employee: emp, status: 'ABSENT' as const, isLate: false, isEarlyDeparture: false };
      }

      const firstIn = checkIns[0].transaction_time;
      const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1].transaction_time : undefined;

      let totalHours: number | undefined;
      let overtime: number | undefined;

      if (lastOut) {
        totalHours = calcHours(firstIn, lastOut);
        overtime = totalHours > STANDARD_HOURS ? totalHours - STANDARD_HOURS : 0;
      }

      return {
        employee: emp,
        status: 'PRESENT' as const,
        checkIn: firstIn,
        checkOut: lastOut,
        totalHours,
        overtime,
        isLate: firstIn > WORK_START,
        isEarlyDeparture: lastOut ? lastOut < WORK_END : false,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, transactions, leaveRequests, selectedDate]);

  // =========================================================================
  // FILTERING
  // =========================================================================

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => (e as any).department_name as string).filter(Boolean));
    return [...set].sort();
  }, [employees]);

  const filteredRecords = useMemo(() => {
    return dailyRecords.filter((r) => {
      if (departmentFilter !== 'all' && (r.employee as any).department_name !== departmentFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [dailyRecords, departmentFilter, statusFilter]);

  // =========================================================================
  // STATS
  // =========================================================================

  const stats = useMemo(() => {
    const total = dailyRecords.length;
    const present = dailyRecords.filter((r) => r.status === 'PRESENT').length;
    const absent = dailyRecords.filter((r) => r.status === 'ABSENT').length;
    const onLeave = dailyRecords.filter((r) => r.status === 'ON_LEAVE').length;
    const late = dailyRecords.filter((r) => r.isLate).length;
    const early = dailyRecords.filter((r) => r.isEarlyDeparture).length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
    return { total, present, absent, onLeave, late, early, rate };
  }, [dailyRecords]);

  // =========================================================================
  // CSV EXPORT
  // =========================================================================

  const handleExport = () => {
    try {
      const headers = ['Employee ID', 'Name', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Overtime', 'Late', 'Early Departure'];
      const rows = filteredRecords.map((r) => [
        r.employee.employee_number || r.employee.id,
        `${r.employee.first_name} ${r.employee.last_name}`,
        (r.employee as any).department_name || '',
        r.status,
        r.checkIn ? r.checkIn.slice(0, 5) : '-',
        r.checkOut ? r.checkOut.slice(0, 5) : '-',
        r.totalHours ? r.totalHours.toFixed(2) : '-',
        r.overtime ? r.overtime.toFixed(2) : '0',
        r.isLate ? 'Yes' : 'No',
        r.isEarlyDeparture ? 'Yes' : 'No',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // =========================================================================
  // FORMAT HELPERS
  // =========================================================================

  const fmtTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const fmtDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case 'PRESENT': return { bg: '#D1FAE5', color: '#065F46' };
      case 'ABSENT': return { bg: '#FEE2E2', color: '#991B1B' };
      case 'ON_LEAVE': return { bg: '#FEF3C7', color: '#92400E' };
      default: return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  const statusLabel = (s: string, leaveType?: string) => {
    switch (s) {
      case 'PRESENT': return 'Present';
      case 'ABSENT': return 'Absent';
      case 'ON_LEAVE': return leaveType ? `Leave (${leaveType})` : 'On Leave';
      default: return s;
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#618FF5' }} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/attendance">
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div className="flex-1">
            <h2 className="page-title">Daily Attendance Summary</h2>
            <p className="page-description">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="tibbna-grid-4" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: '16px' }}>
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#618FF5' },
          { label: 'Present', value: stats.present, icon: UserCheck, color: '#10B981' },
          { label: 'Absent', value: stats.absent, icon: UserX, color: '#EF4444' },
          { label: 'On Leave', value: stats.onLeave, icon: CalendarDays, color: '#F59E0B' },
          { label: 'Late', value: stats.late, icon: AlertTriangle, color: '#F97316' },
          { label: 'Rate', value: `${stats.rate}%`, icon: Clock, color: '#6366F1' },
        ].map((s) => (
          <div key={s.label} className="tibbna-card">
            <div className="tibbna-card-content" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#a3a3a3', fontWeight: 500 }}>{s.label}</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="tibbna-card" style={{ marginBottom: '16px' }}>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#525252', display: 'block', marginBottom: '4px' }}>Date</label>
              <input
                type="date"
                className="tibbna-input"
                style={{ width: '100%' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#525252', display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                className="tibbna-input"
                style={{ width: '100%' }}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#525252', display: 'block', marginBottom: '4px' }}>Status</label>
              <select
                className="tibbna-input"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            Attendance Records ({filteredRecords.length})
          </h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="tibbna-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>
                    <Clock size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ fontSize: '13px' }}>No attendance records found for this date</p>
                    {(departmentFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        onClick={() => { setDepartmentFilter('all'); setStatusFilter('all'); }}
                        style={{ fontSize: '12px', color: '#618FF5', marginTop: '8px', cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const st = statusStyle(r.status);
                  return (
                    <tr key={r.employee.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={`${r.employee.first_name} ${r.employee.last_name}`} size="sm" />
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>{r.employee.first_name} {r.employee.last_name}</p>
                            <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{r.employee.employee_number}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{(r.employee as any).department_name || '-'}</td>
                      <td>
                        <span className="tibbna-badge" style={{ backgroundColor: st.bg, color: st.color }}>
                          {statusLabel(r.status, r.leaveType)}
                        </span>
                      </td>
                      <td>
                        {r.checkIn ? (
                          <div>
                            <span style={{ fontSize: '13px' }}>{fmtTime(r.checkIn)}</span>
                            {r.isLate && (
                              <span style={{ fontSize: '10px', color: '#F97316', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                                <AlertTriangle size={10} /> Late
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#a3a3a3' }}>-</span>
                        )}
                      </td>
                      <td>
                        {r.checkOut ? (
                          <div>
                            <span style={{ fontSize: '13px' }}>{fmtTime(r.checkOut)}</span>
                            {r.isEarlyDeparture && (
                              <span style={{ fontSize: '10px', color: '#F97316', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                                <AlertTriangle size={10} /> Early
                              </span>
                            )}
                          </div>
                        ) : r.status === 'PRESENT' ? (
                          <span style={{ fontSize: '12px', color: '#618FF5', fontWeight: 500 }}>Still in</span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#a3a3a3' }}>-</span>
                        )}
                      </td>
                      <td>
                        {r.totalHours != null ? (
                          <div>
                            <span style={{ fontSize: '13px' }}>{fmtDuration(r.totalHours)}</span>
                            {r.overtime != null && r.overtime > 0 && (
                              <span style={{ fontSize: '10px', color: '#10B981', display: 'block' }}>
                                +{fmtDuration(r.overtime)} OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#a3a3a3' }}>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#525252' }}>
                        {r.status === 'ON_LEAVE' && r.leaveType ? r.leaveType : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#a3a3a3' }}>
              <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: '13px' }}>No records found</p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const st = statusStyle(r.status);
              return (
                <div key={r.employee.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <EmployeeAvatar name={`${r.employee.first_name} ${r.employee.last_name}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{r.employee.first_name} {r.employee.last_name}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{(r.employee as any).department_name}</p>
                    </div>
                    <span className="tibbna-badge" style={{ backgroundColor: st.bg, color: st.color, fontSize: '10px' }}>
                      {statusLabel(r.status, r.leaveType)}
                    </span>
                  </div>
                  {r.status === 'PRESENT' && (
                    <div className="flex gap-4" style={{ fontSize: '12px', color: '#525252', paddingLeft: '40px' }}>
                      <span className="flex items-center gap-1">
                        <LogIn size={12} style={{ color: '#10B981' }} />
                        {r.checkIn ? fmtTime(r.checkIn) : '-'}
                        {r.isLate && <span style={{ color: '#F97316', fontSize: '10px' }}>(Late)</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <LogOut size={12} style={{ color: '#618FF5' }} />
                        {r.checkOut ? fmtTime(r.checkOut) : 'Still in'}
                        {r.isEarlyDeparture && <span style={{ color: '#F97316', fontSize: '10px' }}>(Early)</span>}
                      </span>
                      {r.totalHours != null && (
                        <span>{fmtDuration(r.totalHours)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
