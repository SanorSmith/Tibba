'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Play, Eye, CheckCircle, Clock, Users, AlertTriangle,
  CalendarDays, Download, RefreshCw, Timer, TrendingUp,
} from 'lucide-react';
import type { Employee, AttendanceTransaction, DailyAttendanceSummary, LeaveRequest } from '@/types/hr';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Work-time constants
const WORK_START = '08:30';
const WORK_END   = '16:30';
const STANDARD_HOURS = 8;
const LATE_THRESHOLD_MIN = 15;

export default function AttendanceProcessingPage() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole(['HR_ADMIN', 'Administrator']);

  // =========================================================================
  // STATE
  // =========================================================================

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<AttendanceTransaction[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [existingSummaries, setExistingSummaries] = useState<DailyAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Processing options
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [overwrite, setOverwrite] = useState(false);

  // Preview
  const [preview, setPreview] = useState<DailyAttendanceSummary[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // =========================================================================
  // LOAD DATA
  // =========================================================================

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    try {
      setEmployees(dataStore.getEmployees());
      setTransactions(dataStore.getAttendanceTransactions());
      setLeaveRequests(dataStore.getLeaveRequests());
      setExistingSummaries(dataStore.getProcessedSummaries());
    } catch (err) {
      console.error('Load error:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // PROCESSING ENGINE  (First IN / Last OUT — Iraqi Req #7)
  // =========================================================================

  const buildSummary = (emp: Employee, date: string): DailyAttendanceSummary => {
    const empName = `${emp.first_name} ${emp.last_name}`;
    const dept = (emp as any).department_name || '';

    // Check approved leave
    const onLeave = leaveRequests.find(
      lr =>
        lr.employee_id === emp.id &&
        lr.status === 'APPROVED' &&
        date >= lr.start_date &&
        date <= lr.end_date
    );
    if (onLeave) {
      return {
        id: `SUM-${date}-${emp.id}`,
        employee_id: emp.id,
        employee_name: empName,
        department: dept,
        date,
        status: 'LEAVE',
        total_hours: 0,
        overtime_hours: 0,
      };
    }

    // Get day transactions sorted by time
    const dayTxns = transactions
      .filter(t => t.employee_id === emp.id && t.transaction_date === date)
      .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));

    const checkIns  = dayTxns.filter(t => t.transaction_type === 'CHECK_IN');
    const checkOuts = dayTxns.filter(t => t.transaction_type === 'CHECK_OUT');

    // No check-in → absent
    if (checkIns.length === 0) {
      return {
        id: `SUM-${date}-${emp.id}`,
        employee_id: emp.id,
        employee_name: empName,
        department: dept,
        date,
        status: 'ABSENT',
        total_hours: 0,
        overtime_hours: 0,
      };
    }

    // First IN / Last OUT
    const firstIn = checkIns[0].transaction_time;                       // HH:MM:SS
    const lastOut = checkOuts.length > 0
      ? checkOuts[checkOuts.length - 1].transaction_time
      : undefined;

    // Late calculation
    const lateMins = timeDiffMinutes(WORK_START, firstIn);
    const isLate = lateMins >= LATE_THRESHOLD_MIN;

    // Work hours
    let totalHours = 0;
    let overtimeHours = 0;
    if (lastOut) {
      totalHours = Math.max(0, timeDiffMinutes(firstIn, lastOut) / 60);
      overtimeHours = totalHours > STANDARD_HOURS ? +(totalHours - STANDARD_HOURS).toFixed(2) : 0;
    }

    const regularHours = Math.min(totalHours, STANDARD_HOURS);

    return {
      id: `SUM-${date}-${emp.id}`,
      employee_id: emp.id,
      employee_name: empName,
      department: dept,
      date,
      first_in: firstIn,
      last_out: lastOut,
      total_hours: +totalHours.toFixed(2),
      regular_hours: +regularHours.toFixed(2),
      overtime_hours: overtimeHours,
      late_minutes: isLate ? lateMins : 0,
      status: isLate ? 'LATE' : 'PRESENT',
    };
  };

  const timeDiffMinutes = (t1: string, t2: string): number => {
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const generateForDate = (date: string): DailyAttendanceSummary[] => {
    const active = employees.filter(e => (e as any).employment_status === 'ACTIVE');
    return active.map(emp => buildSummary(emp, date));
  };

  const generateForRange = (from: string, to: string): DailyAttendanceSummary[] => {
    const result: DailyAttendanceSummary[] = [];
    const start = new Date(from);
    const end   = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(...generateForDate(d.toISOString().split('T')[0]));
    }
    return result;
  };

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handlePreview = () => {
    const summaries = mode === 'single'
      ? generateForDate(selectedDate)
      : generateForRange(dateFrom, dateTo);
    setPreview(summaries);
    setShowPreview(true);
    toast.success(`Preview generated: ${summaries.length} records`);
  };

  const handleProcess = () => {
    if (!isManager) {
      toast.error('Only HR Admin / Administrator can process attendance');
      return;
    }
    if (preview.length === 0) {
      toast.error('Generate a preview first');
      return;
    }

    setProcessing(true);
    try {
      const dates = [...new Set(preview.map(s => s.date))];

      if (overwrite) {
        let deleted = 0;
        dates.forEach(d => { deleted += dataStore.deleteProcessedSummariesByDate(d); });
        if (deleted > 0) console.log(`Overwrite: removed ${deleted} old records`);
      }

      // Filter out already-existing if not overwriting
      let toSave = preview;
      if (!overwrite) {
        const existKeys = new Set(existingSummaries.map(s => `${s.date}|${s.employee_id}`));
        toSave = preview.filter(s => !existKeys.has(`${s.date}|${s.employee_id}`));
        const skipped = preview.length - toSave.length;
        if (skipped > 0) {
          toast.warning(`Skipped ${skipped} existing records. Enable "Overwrite" to replace.`);
        }
        if (toSave.length === 0) {
          toast.info('All records already exist');
          setProcessing(false);
          return;
        }
      }

      const ok = dataStore.batchAddProcessedSummaries(toSave);
      if (ok) {
        toast.success(`Processed ${toSave.length} attendance records`);
        loadData();
        setPreview([]);
        setShowPreview(false);
      } else {
        toast.error('Failed to save');
      }
    } catch (err) {
      console.error('Process error:', err);
      toast.error('Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================================
  // STATS
  // =========================================================================

  const previewStats = useMemo(() => {
    if (preview.length === 0) return null;
    const present  = preview.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
    const absent   = preview.filter(s => s.status === 'ABSENT').length;
    const onLeave  = preview.filter(s => s.status === 'LEAVE').length;
    const late     = preview.filter(s => (s.late_minutes ?? 0) >= LATE_THRESHOLD_MIN).length;
    const otCount  = preview.filter(s => s.overtime_hours > 0).length;
    const otTotal  = preview.reduce((sum, s) => sum + s.overtime_hours, 0);
    return { total: preview.length, present, absent, onLeave, late, otCount, otTotal };
  }, [preview]);

  const processingInfo = useMemo(() => {
    const dates: string[] = [];
    if (mode === 'single') {
      dates.push(selectedDate);
    } else {
      const s = new Date(dateFrom);
      const e = new Date(dateTo);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    const existingDates = dates.filter(dt => existingSummaries.some(s => s.date === dt));
    return { dates, total: dates.length, existingDates, hasExisting: existingDates.length > 0 };
  }, [mode, selectedDate, dateFrom, dateTo, existingSummaries]);

  const processedDatesList = useMemo(() => {
    return [...new Set(existingSummaries.map(s => s.date))].sort().reverse();
  }, [existingSummaries]);

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
            <h2 className="page-title">Attendance Processing</h2>
            <p className="page-description">Generate daily summaries with First IN / Last OUT (Iraqi Req #7)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tibbna-section">
        {/* ============================================================== */}
        {/* LEFT: Processing Options + Preview                             */}
        {/* ============================================================== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Mode Selection */}
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Processing Mode</h3>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setMode('single')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                    mode === 'single'
                      ? 'border-[#618FF5] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className={mode === 'single' ? 'text-[#618FF5]' : 'text-gray-400'} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Single Date</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Process one day</p>
                </button>
                <button
                  onClick={() => setMode('range')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                    mode === 'range'
                      ? 'border-[#618FF5] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className={mode === 'range' ? 'text-[#618FF5]' : 'text-gray-400'} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Date Range</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Process multiple days</p>
                </button>
              </div>

              {/* Date inputs */}
              {mode === 'single' ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: '#525252', display: 'block', marginBottom: '4px' }}>Processing Date</label>
                  <input
                    type="date"
                    className="tibbna-input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#525252', display: 'block', marginBottom: '4px' }}>From</label>
                    <input type="date" className="tibbna-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#525252', display: 'block', marginBottom: '4px' }}>To</label>
                    <input type="date" className="tibbna-input" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} max={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              )}

              {/* Overwrite toggle */}
              <label className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #e4e4e4' }}>
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={e => setOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                  style={{ accentColor: '#618FF5' }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Overwrite Existing Summaries</span>
                  <p style={{ fontSize: '11px', color: '#6B7280' }}>Replace existing records if they exist</p>
                </div>
              </label>

              {/* Warning for existing */}
              {processingInfo.hasExisting && !overwrite && (
                <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ color: '#92400E', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '11px', color: '#92400E' }}>
                    <strong>{processingInfo.existingDates.length}</strong> of {processingInfo.total} date(s) already have summaries. They will be skipped unless you enable overwrite.
                  </p>
                </div>
              )}

              {/* Generate Preview button */}
              <button
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                onClick={handlePreview}
              >
                <Eye size={16} /> Generate Preview
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Preview Results                                               */}
          {/* ============================================================ */}
          {showPreview && previewStats && (
            <div className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Processing Preview</h3>
                  <button onClick={() => { setShowPreview(false); setPreview([]); }} className="btn-secondary p-1">✕</button>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                  {[
                    { label: 'Total',    value: previewStats.total,   color: '#525252', bg: '#F5F5F5' },
                    { label: 'Present',  value: previewStats.present, color: '#10B981', bg: '#D1FAE5' },
                    { label: 'Absent',   value: previewStats.absent,  color: '#EF4444', bg: '#FEE2E2' },
                    { label: 'On Leave', value: previewStats.onLeave, color: '#8B5CF6', bg: '#EDE9FE' },
                    { label: 'Late',     value: previewStats.late,    color: '#F59E0B', bg: '#FEF3C7' },
                    { label: 'Overtime',  value: previewStats.otCount, color: '#3B82F6', bg: '#DBEAFE' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px', borderRadius: '8px', backgroundColor: s.bg }}>
                      <p style={{ fontSize: '10px', color: '#6B7280' }}>{s.label}</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {previewStats.otTotal > 0 && (
                  <p style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '12px' }}>
                    <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Total overtime: <strong>{previewStats.otTotal.toFixed(1)}h</strong>
                  </p>
                )}

                {/* Preview table (desktop) */}
                <div className="hidden md:block" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="tibbna-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>First IN</th>
                        <th>Last OUT</th>
                        <th>Hours</th>
                        <th>OT</th>
                        <th>Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 100).map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.employee_name}</td>
                          <td>{s.date}</td>
                          <td>
                            <span
                              className="tibbna-badge"
                              style={{
                                backgroundColor:
                                  s.status === 'PRESENT' ? '#D1FAE5' :
                                  s.status === 'LATE'    ? '#FEF3C7' :
                                  s.status === 'LEAVE'   ? '#EDE9FE' :
                                  s.status === 'ABSENT'  ? '#FEE2E2' : '#F5F5F5',
                                color:
                                  s.status === 'PRESENT' ? '#065F46' :
                                  s.status === 'LATE'    ? '#92400E' :
                                  s.status === 'LEAVE'   ? '#6D28D9' :
                                  s.status === 'ABSENT'  ? '#991B1B' : '#525252',
                              }}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td>{s.first_in?.slice(0, 5) || '—'}</td>
                          <td>{s.last_out?.slice(0, 5) || '—'}</td>
                          <td>{s.total_hours > 0 ? `${s.total_hours.toFixed(1)}h` : '—'}</td>
                          <td style={{ color: s.overtime_hours > 0 ? '#3B82F6' : undefined }}>
                            {s.overtime_hours > 0 ? `+${s.overtime_hours.toFixed(1)}h` : '—'}
                          </td>
                          <td style={{ color: (s.late_minutes ?? 0) > 0 ? '#F59E0B' : undefined }}>
                            {(s.late_minutes ?? 0) > 0 ? `${s.late_minutes}m` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 100 && (
                    <p style={{ fontSize: '11px', color: '#a3a3a3', textAlign: 'center', padding: '8px' }}>
                      Showing 100 of {preview.length} records
                    </p>
                  )}
                </div>

                {/* Preview cards (mobile) */}
                <div className="md:hidden space-y-2" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {preview.slice(0, 50).map(s => (
                    <div key={s.id} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e4e4e4' }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{s.employee_name}</span>
                        <span
                          className="tibbna-badge"
                          style={{
                            fontSize: '10px',
                            backgroundColor:
                              s.status === 'PRESENT' ? '#D1FAE5' :
                              s.status === 'LATE'    ? '#FEF3C7' :
                              s.status === 'LEAVE'   ? '#EDE9FE' : '#FEE2E2',
                            color:
                              s.status === 'PRESENT' ? '#065F46' :
                              s.status === 'LATE'    ? '#92400E' :
                              s.status === 'LEAVE'   ? '#6D28D9' : '#991B1B',
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>
                        {s.date} | {s.first_in?.slice(0, 5) || '—'} → {s.last_out?.slice(0, 5) || '—'} | {s.total_hours > 0 ? `${s.total_hours.toFixed(1)}h` : '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Process button */}
                <button
                  className="w-full mt-4 flex items-center justify-center gap-2"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#fff',
                    backgroundColor: processing ? '#9CA3AF' : '#10B981',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    border: 'none',
                  }}
                  onClick={handleProcess}
                  disabled={processing || !isManager}
                >
                  {processing ? (
                    <><RefreshCw size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle size={16} /> Process {previewStats.total} Records</>
                  )}
                </button>

                {!isManager && (
                  <p style={{ fontSize: '11px', color: '#EF4444', textAlign: 'center', marginTop: '6px' }}>
                    You need HR Admin or Administrator role to process attendance
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT: Rules + History                                          */}
        {/* ============================================================== */}
        <div className="lg:col-span-1 space-y-4">

          {/* Processing Rules */}
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Processing Rules</h3>
              <div className="space-y-3">
                {[
                  { icon: <CheckCircle size={14} />, title: 'First IN / Last OUT', desc: 'Uses earliest check-in and latest check-out per day (Iraqi Req #7)' },
                  { icon: <Clock size={14} />,       title: 'Work Hours',          desc: 'Standard: 08:30 – 16:30 (8 hours)' },
                  { icon: <TrendingUp size={14} />,  title: 'Overtime',            desc: 'Hours beyond 8h calculated automatically' },
                  { icon: <AlertTriangle size={14} />, title: 'Late Threshold',    desc: 'Flagged if check-in ≥ 15 min after 08:30' },
                  { icon: <CalendarDays size={14} />,  title: 'Leave Integration', desc: 'Approved leaves auto-marked as LEAVE' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-2">
                    <span style={{ color: '#618FF5', marginTop: '2px', flexShrink: 0 }}>{r.icon}</span>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600 }}>{r.title}</p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#1E40AF' }}>
                  <strong>Tip:</strong> Always preview before processing to verify results.
                </p>
              </div>
            </div>
          </div>

          {/* Processing History */}
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Processed Dates</h3>
              <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                {processedDatesList.length > 0
                  ? `${processedDatesList.length} date(s) processed — ${existingSummaries.length} total records`
                  : 'No processed summaries yet'}
              </p>

              {processedDatesList.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {processedDatesList.slice(0, 20).map(date => {
                    const count = existingSummaries.filter(s => s.date === date).length;
                    return (
                      <div key={date} className="flex items-center justify-between" style={{ padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{ fontSize: '12px', color: '#525252' }}>
                          {new Date(date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="tibbna-badge" style={{ fontSize: '10px', backgroundColor: '#D1FAE5', color: '#065F46' }}>
                          {count} records
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Data Overview</h3>
              <div className="space-y-2">
                {[
                  { label: 'Active Employees', value: employees.filter(e => (e as any).employment_status === 'ACTIVE').length, icon: <Users size={14} /> },
                  { label: 'Total Transactions', value: transactions.length, icon: <Timer size={14} /> },
                  { label: 'Approved Leaves', value: leaveRequests.filter(l => l.status === 'APPROVED').length, icon: <CalendarDays size={14} /> },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#618FF5' }}>{s.icon}</span>
                      <span style={{ fontSize: '12px', color: '#525252' }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
