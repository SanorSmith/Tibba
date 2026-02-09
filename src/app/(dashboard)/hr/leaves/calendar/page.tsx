'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Calendar, List, X, RotateCcw
} from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import leavesData from '@/data/hr/leaves.json';
import type { LeaveRequest, Employee } from '@/types/hr';

// ============================================================================
// TYPES
// ============================================================================
interface LeaveBlock {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  status: string;
  isStart: boolean;
  isEnd: boolean;
}

interface CalendarDay {
  date: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  leaves: LeaveBlock[];
}

// ============================================================================
// CONSTANTS
// ============================================================================
const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const LEAVE_COLORS: Record<string, { bg: string; text: string; solid: string }> = {
  'Annual Leave':       { bg: '#DBEAFE', text: '#1E40AF', solid: '#3B82F6' },
  'Sick Leave':         { bg: '#FEE2E2', text: '#991B1B', solid: '#EF4444' },
  'Emergency Leave':    { bg: '#FEF3C7', text: '#92400E', solid: '#F59E0B' },
  'Maternity Leave':    { bg: '#FCE7F3', text: '#9D174D', solid: '#EC4899' },
  'Paternity Leave':    { bg: '#EDE9FE', text: '#5B21B6', solid: '#8B5CF6' },
  'Unpaid Leave':       { bg: '#F3F4F6', text: '#374151', solid: '#6B7280' },
  'Hajj Leave':         { bg: '#D1FAE5', text: '#065F46', solid: '#059669' },
  'Study Leave':        { bg: '#E0F2FE', text: '#075985', solid: '#0EA5E9' },
  'Compensatory Leave': { bg: '#DCFCE7', text: '#166534', solid: '#22C55E' },
};

const DEFAULT_COLOR = { bg: '#F3F4F6', text: '#374151', solid: '#6B7280' };

export default function LeaveCalendarPage() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filters
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Detail modal
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      setAllRequests(dataStore.getLeaveRequests());
      setEmployees(dataStore.getEmployees());
    } catch (err) {
      console.error('Error loading calendar data:', err);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DERIVED
  // =========================================================================
  const holidays = leavesData.holidays;

  const departments = useMemo(
    () => [...new Set(employees.map(e => e.department_name).filter(Boolean))].sort(),
    [employees]
  );

  const leaveTypes = useMemo(
    () => [...new Set(allRequests.map(r => r.leave_type))].sort(),
    [allRequests]
  );

  const getEmp = useCallback(
    (id: string) => employees.find(e => e.id === id),
    [employees]
  );

  const empName = useCallback(
    (id: string) => { const e = getEmp(id); return e ? `${e.first_name} ${e.last_name}` : id; },
    [getEmp]
  );

  // =========================================================================
  // FILTERED REQUESTS
  // =========================================================================
  const filteredRequests = useMemo(() => {
    let filtered = allRequests;
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(r => r.leave_type === typeFilter);
    if (employeeFilter !== 'all') filtered = filtered.filter(r => r.employee_id === employeeFilter);
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(r => {
        const emp = getEmp(r.employee_id);
        return emp?.department_name === departmentFilter;
      });
    }
    return filtered;
  }, [allRequests, statusFilter, typeFilter, employeeFilter, departmentFilter, getEmp]);

  const hasActiveFilters = statusFilter !== 'APPROVED' || typeFilter !== 'all' || departmentFilter !== 'all' || employeeFilter !== 'all';

  const clearFilters = () => { setStatusFilter('APPROVED'); setTypeFilter('all'); setDepartmentFilter('all'); setEmployeeFilter('all'); };

  // =========================================================================
  // CALENDAR GENERATION
  // =========================================================================
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Saturday-start week: offset = (day + 1) % 7
    const startOffset = (firstDay.getDay() + 1) % 7;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days: CalendarDay[] = [];

    // Empty cells for previous month
    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(year, month, -startOffset + i + 1);
      const d = prevDate.getDate();
      const ds = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = prevDate.getDay();
      days.push({
        date: d, dateStr: ds, isCurrentMonth: false, isToday: false,
        isWeekend: dow === 5 || dow === 6, isHoliday: false, leaves: [],
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const dow = dateObj.getDay();
      const holiday = holidays.find(h => h.date === dateStr);

      const dayLeaves: LeaveBlock[] = [];
      filteredRequests.forEach(req => {
        if (dateStr >= req.start_date && dateStr <= req.end_date) {
          dayLeaves.push({
            requestId: req.id,
            employeeId: req.employee_id,
            employeeName: req.employee_name || empName(req.employee_id),
            leaveType: req.leave_type,
            status: req.status,
            isStart: dateStr === req.start_date,
            isEnd: dateStr === req.end_date,
          });
        }
      });

      days.push({
        date: d, dateStr, isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dow === 5 || dow === 6,
        isHoliday: !!holiday, holidayName: holiday?.name,
        leaves: dayLeaves,
      });
    }

    // Fill remaining cells to complete the last row
    const remainder = days.length % 7;
    if (remainder > 0) {
      const fill = 7 - remainder;
      for (let i = 1; i <= fill; i++) {
        const nextDate = new Date(year, month + 1, i);
        const d = nextDate.getDate();
        const ds = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dow = nextDate.getDay();
        days.push({
          date: d, dateStr: ds, isCurrentMonth: false, isToday: false,
          isWeekend: dow === 5 || dow === 6, isHoliday: false, leaves: [],
        });
      }
    }

    return days;
  }, [year, month, filteredRequests, holidays, empName]);

  // List view: requests overlapping the current month
  const monthRequests = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    return filteredRequests.filter(r => r.start_date <= monthEnd && r.end_date >= monthStart)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [filteredRequests, year, month]);

  // =========================================================================
  // NAVIGATION
  // =========================================================================
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // =========================================================================
  // HELPERS
  // =========================================================================
  const fmtDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getColor = (type: string) => LEAVE_COLORS[type] || DEFAULT_COLOR;

  // =========================================================================
  // RENDER
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading calendar…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Calendar</h2>
            <p className="page-description">Visual overview of leave requests and holidays</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
            className="btn-secondary flex items-center gap-2"
          >
            {viewMode === 'calendar' ? <><List size={14} /> List View</> : <><Calendar size={14} /> Calendar</>}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* FILTERS                                                           */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select className="tibbna-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Leave Types</option>
              {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="tibbna-input" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="tibbna-input" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            {hasActiveFilters && (
              <button className="btn-secondary flex items-center gap-1 justify-center" onClick={clearFilters}>
                <RotateCcw size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MONTH NAVIGATION                                                  */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
              <h3 style={{ fontSize: '18px', fontWeight: 700, minWidth: '200px', textAlign: 'center' }}>{monthName}</h3>
              <button onClick={nextMonth} className="btn-secondary p-2"><ChevronRight size={16} /></button>
              <button onClick={goToday} className="btn-secondary" style={{ fontSize: '12px', color: '#618FF5' }}>Today</button>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              {filteredRequests.length} request(s) matching filters
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* LEGEND                                                            */}
      {/* ================================================================= */}
      <div className="flex flex-wrap gap-3 tibbna-section">
        {Object.entries(LEAVE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: c.solid }} />
            <span style={{ fontSize: '11px', color: '#525252' }}>{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }} />
          <span style={{ fontSize: '11px', color: '#525252' }}>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB' }} />
          <span style={{ fontSize: '11px', color: '#525252' }}>Weekend (Fri/Sat)</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* CALENDAR VIEW                                                     */}
      {/* ================================================================= */}
      {viewMode === 'calendar' ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content" style={{ padding: 0 }}>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: '#e4e4e4' }}>
              {DAYS.map(d => (
                <div
                  key={d}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: d === 'Fri' || d === 'Sat' ? '#EF4444' : '#525252',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: '#e4e4e4' }}>
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: day.isHoliday ? '#FFFBEB' : day.isWeekend ? '#FAFAFA' : '#fff',
                    minHeight: '90px',
                    padding: '4px',
                    opacity: day.isCurrentMonth ? 1 : 0.35,
                    position: 'relative',
                    ...(day.isToday ? { boxShadow: 'inset 0 0 0 2px #618FF5' } : {}),
                  }}
                >
                  {/* Day number + leave count */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: day.isToday ? '#fff' : day.isHoliday ? '#92400E' : '#111827',
                        ...(day.isToday ? {
                          backgroundColor: '#618FF5',
                          width: '22px', height: '22px', borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        } : {}),
                      }}
                    >
                      {day.date}
                    </span>
                    {day.leaves.length > 0 && (
                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '8px', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }}>
                        {day.leaves.length}
                      </span>
                    )}
                    {day.isHoliday && !day.leaves.length && (
                      <span style={{ fontSize: '8px', color: '#92400E' }}>🏛</span>
                    )}
                  </div>

                  {/* Holiday name */}
                  {day.isHoliday && (
                    <p style={{ fontSize: '8px', color: '#92400E', lineHeight: '1.2', marginBottom: '2px' }}>{day.holidayName}</p>
                  )}

                  {/* Leave blocks */}
                  {day.leaves.slice(0, 3).map((leave, i) => {
                    const c = getColor(leave.leaveType);
                    return (
                      <button
                        key={`${leave.requestId}-${i}`}
                        onClick={() => {
                          const req = allRequests.find(r => r.id === leave.requestId);
                          if (req) setSelectedLeave(req);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          backgroundColor: c.bg,
                          color: c.text,
                          fontSize: '9px',
                          padding: '1px 4px',
                          marginTop: '1px',
                          borderRadius: '2px',
                          border: 'none',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap' as const,
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                        title={`${leave.employeeName} — ${leave.leaveType}`}
                      >
                        {leave.isStart ? '→ ' : ''}{leave.employeeName.split(' ')[0]}{leave.isEnd ? ' ←' : ''}
                      </button>
                    );
                  })}
                  {day.leaves.length > 3 && (
                    <p style={{ fontSize: '8px', color: '#6B7280', marginTop: '1px', textAlign: 'center' }}>+{day.leaves.length - 3} more</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================= */
        /* LIST VIEW                                                         */
        /* ================================================================= */
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-card-title">Leaves — {monthName}</h3>
          </div>
          <div className="tibbna-card-content">
            {monthRequests.length > 0 ? (
              <div className="space-y-2">
                {monthRequests.map(lr => {
                  const c = getColor(lr.leave_type);
                  return (
                    <div
                      key={lr.id}
                      className="flex items-center gap-3"
                      style={{ padding: '10px', border: '1px solid #e4e4e4', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={() => setSelectedLeave(lr)}
                    >
                      <div style={{ width: '4px', height: '40px', borderRadius: '4px', backgroundColor: c.solid, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{lr.employee_name || empName(lr.employee_id)}</p>
                        <p style={{ fontSize: '11px', color: '#525252' }}>
                          {lr.leave_type} &nbsp;|&nbsp; {fmtDate(lr.start_date)} → {fmtDate(lr.end_date)} ({lr.total_days}d)
                        </p>
                      </div>
                      <SmartStatusBadge status={lr.status} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '32px' }}>No leave requests for this month</p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DETAIL MODAL                                                      */}
      {/* ================================================================= */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Leave Details</h3>
              <div className="flex items-center gap-2">
                <SmartStatusBadge status={selectedLeave.status} />
                <button onClick={() => setSelectedLeave(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4" style={{ fontSize: '13px' }}>
              {/* Employee */}
              <div className="flex items-center gap-3">
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: getColor(selectedLeave.leave_type).bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 600, color: getColor(selectedLeave.leave_type).text, flexShrink: 0,
                }}>
                  {(() => { const e = getEmp(selectedLeave.employee_id); return e ? `${e.first_name[0]}${e.last_name[0]}` : '??'; })()}
                </div>
                <div>
                  <p style={{ fontWeight: 600 }}>{selectedLeave.employee_name || empName(selectedLeave.employee_id)}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280' }}>{getEmp(selectedLeave.employee_id)?.department_name || selectedLeave.department || '-'}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Leave Type</span><p style={{ fontWeight: 500 }}>{selectedLeave.leave_type}</p></div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Duration</span><p style={{ fontWeight: 600, color: '#1D4ED8' }}>{selectedLeave.total_days} day(s){selectedLeave.is_half_day ? ' (½)' : ''}</p></div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Start Date</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedLeave.start_date)}</p></div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>End Date</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedLeave.end_date)}</p></div>
              </div>

              {/* Reason */}
              <div>
                <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Reason</span>
                <p style={{ fontWeight: 500, marginTop: '2px' }}>{selectedLeave.reason}</p>
              </div>

              {/* Rejection reason */}
              {selectedLeave.rejection_reason && (
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B' }}>Rejection Reason</span>
                  <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>{selectedLeave.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb' }}>
              <button className="btn-secondary" onClick={() => setSelectedLeave(null)}>Close</button>
              <Link href={`/hr/leaves/requests/${selectedLeave.id}`}>
                <button className="btn-secondary flex items-center gap-1" style={{ fontSize: '12px' }}>View Full Details</button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
