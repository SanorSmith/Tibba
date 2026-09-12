'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Clock, UserCheck, UserX, AlertTriangle, Timer, Calendar, Fingerprint, ClipboardList, FileBarChart, ChevronRight, LogIn, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import attendanceJson from '@/data/hr/attendance.json';

export default function AttendancePage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Manual attendance entry modal
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [shiftList, setShiftList] = useState<any[]>([]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entry, setEntry] = useState({
    employee_id: '', date: new Date().toISOString().split('T')[0],
    shift_id: 'DAY', first_in: '08:00', last_out: '17:00', status: 'PRESENT',
  });

  // Live preview of computed hours
  const previewHours = useMemo(() => {
    if (!entry.first_in || !entry.last_out) return null;
    const [ih, im] = entry.first_in.split(':').map(Number);
    const [oh, om] = entry.last_out.split(':').map(Number);
    let total = (oh * 60 + om - ih * 60 - im) / 60;
    if (total < 0) total += 24; // overnight
    const regular = Math.min(total, 8);
    const overtime = Math.max(0, total - 8);
    return { total: total.toFixed(1), regular: regular.toFixed(1), overtime: overtime.toFixed(1) };
  }, [entry.first_in, entry.last_out]);

  const openManualEntry = async () => {
    setShowManualEntry(true);
    // Load staff + shifts for the dropdowns (once)
    if (staffList.length === 0) {
      try {
        const [st, sh] = await Promise.all([
          fetch('/api/hr/staff').then(r => r.json()),
          fetch('/api/hr/attendance/staff').then(r => r.json()).catch(() => ({})),
        ]);
        const rows = st.data ?? st.staff ?? st ?? [];
        setStaffList(Array.isArray(rows) ? rows : []);
      } catch { /* non-fatal */ }
    }
  };

  const submitManualEntry = async () => {
    if (!entry.employee_id) { toast.error('Select an employee'); return; }
    setSavingEntry(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');
      toast.success(`Attendance saved — overtime ${previewHours?.overtime ?? 0}h auto-calculated`);
      setShowManualEntry(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingEntry(false);
    }
  };

  // =========================================================================
  // LOAD DATA FROM DATABASE API
  // =========================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/hr/attendance?date=${today}`);
      const result = await response.json();
      
      if (result.success) {
        setSummaries(result.data);
      } else {
        // Logged but never shown: the person at the screen saw nothing.
        toast.error(result?.error || 'Could not load data');
        throw new Error(result.error || 'Failed to load attendance data');
      }
    } catch (error: any) {
      console.error('❌ Error loading attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const monthly = attendanceJson.monthly_summary;

  // =========================================================================
  // CALCULATIONS
  // =========================================================================

  const filtered = useMemo(() => {
    return filter === 'all' ? summaries : summaries.filter(s => s.status === filter);
  }, [summaries, filter]);

  const stats = useMemo(() => {
    const present = summaries.filter(s => s.status === 'PRESENT').length;
    const absent = summaries.filter(s => s.status === 'ABSENT').length;
    const onLeave = summaries.filter(s => s.status === 'LEAVE').length;
    const lateArrivals = summaries.filter(s => s.late_minutes > 0).length;
    const totalOvertime = summaries.reduce((sum: number, s: any) => sum + (s.overtime_hours || 0), 0);
    const attendanceRate = summaries.length > 0 ? ((present / summaries.length) * 100).toFixed(1) : '0';

    return { present, absent, onLeave, lateArrivals, totalOvertime, attendanceRate };
  }, [summaries]);

  // Recent activity: summaries sorted by check-in time (most recent first)
  const recentActivity = useMemo(() => {
    return summaries
      .filter(s => s.first_in)
      .sort((a, b) => {
        const timeA = a.first_in || '00:00';
        const timeB = b.first_in || '00:00';
        return timeB.localeCompare(timeA);
      })
      .slice(0, 8);
  }, [summaries]);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
          <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Attendance & Time Tracking</h2>
          <p className="page-description">Daily attendance for {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadData} 
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Timer size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link href="/hr/attendance/exceptions">
            <button className="btn-secondary flex items-center gap-2"><AlertTriangle size={14} /><span className="hidden sm:inline">Exceptions</span></button>
          </Link>
          <button onClick={openManualEntry} className="btn-secondary flex items-center gap-2">
            <Plus size={14} /><span className="hidden sm:inline">Manual Entry</span>
          </button>
          <Link href="/hr/attendance/biometric">
            <button className="btn-primary flex items-center gap-2"><Fingerprint size={14} /><span className="hidden sm:inline">Biometric</span></button>
          </Link>
        </div>
      </div>

      {/* Manual Attendance Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Manual Attendance Entry</h3>
              <button onClick={() => setShowManualEntry(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Employee *</label>
                <select value={entry.employee_id} onChange={e => setEntry(s => ({ ...s, employee_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select employee…</option>
                  {staffList.map((s: any) => (
                    <option key={s.staffid || s.id} value={s.staffid || s.id}>
                      {s.full_name || `${s.firstname || ''} ${s.lastname || ''}`.trim()} {s.staff_id ? `(${s.staff_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Date</label>
                  <input type="date" value={entry.date} onChange={e => setEntry(s => ({ ...s, date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Shift</label>
                  <select value={entry.shift_id} onChange={e => setEntry(s => ({ ...s, shift_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="DAY">Day Shift</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                    <option value="NIGHT">Night</option>
                    <option value="12H-DAY">12-Hour Day</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Check In</label>
                  <input type="time" value={entry.first_in} onChange={e => setEntry(s => ({ ...s, first_in: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Check Out</label>
                  <input type="time" value={entry.last_out} onChange={e => setEntry(s => ({ ...s, last_out: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Live overtime preview */}
              {previewHours && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-gray-600">Total: <strong>{previewHours.total}h</strong></span>
                  <span className="text-gray-600">Regular: <strong>{previewHours.regular}h</strong></span>
                  <span className="text-amber-700">Overtime: <strong>{previewHours.overtime}h</strong></span>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowManualEntry(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitManualEntry} disabled={savingEntry || !entry.employee_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                {savingEntry ? 'Saving…' : <><Plus size={14} /> Save Attendance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Present</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.present}</p>
                <p className="tibbna-card-subtitle">{stats.attendanceRate}% rate</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <UserCheck size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Absent</p>
                <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{stats.absent}</p>
                <p className="tibbna-card-subtitle">Unexcused</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <UserX size={20} style={{ color: '#EF4444' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">On Leave</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.onLeave}</p>
                <p className="tibbna-card-subtitle">Approved</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Late Arrivals</p>
                <p className="tibbna-card-value" style={{ color: '#6366F1' }}>{stats.lateArrivals}</p>
                <p className="tibbna-card-subtitle">Today</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <AlertTriangle size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tibbna-section">
        <Link href="/hr/attendance/biometric">
          <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Biometric Device</h3>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                  <Fingerprint size={18} style={{ color: '#1D4ED8' }} />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Simulate employee check-in/check-out</p>
              <div className="flex items-center justify-between mt-3">
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1D4ED8' }}>
                  Open Device <ChevronRight size={14} />
                </div>
                <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                  {summaries.length} Total
                </div>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/attendance/daily">
          <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Daily Summary</h3>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <ClipboardList size={18} style={{ color: '#065F46' }} />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>View today&apos;s attendance details</p>
              <div className="flex items-center justify-between mt-3">
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#065F46' }}>
                  View Summary <ChevronRight size={14} />
                </div>
                <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  {stats.present} Present
                </div>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/hr/attendance/exceptions">
          <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Exceptions</h3>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                  <AlertTriangle size={18} style={{ color: '#92400E' }} />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Manage late arrivals &amp; early departures</p>
              <div className="flex items-center justify-between mt-3">
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#92400E' }}>
                  View Exceptions <ChevronRight size={14} />
                </div>
                <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                  {stats.lateArrivals} Late
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {[{ v: 'all', l: 'All' }, { v: 'PRESENT', l: 'Present' }, { v: 'ABSENT', l: 'Absent' }, { v: 'LEAVE', l: 'On Leave' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`tibbna-tab ${filter === f.v ? 'tibbna-tab-active' : ''}`}>{f.l}</button>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <div className="flex items-center justify-between w-full">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Attendance Records</h3>
            <Link href="/hr/attendance/reports" style={{ fontSize: '13px', fontWeight: 500, color: '#618FF5' }}>
              View All Reports →
            </Link>
          </div>
        </div>
        <div className="tibbna-card-content">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} style={{ color: '#a3a3a3', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252' }}>No attendance records found</p>
              <p style={{ fontSize: '13px', color: '#a3a3a3', marginTop: '4px' }}>
                {filter !== 'all' ? 'Try a different filter' : 'Use the biometric device to record attendance'}
              </p>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="btn-secondary mt-4">Clear Filter</button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block tibbna-table-container">
                <table className="tibbna-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Shift</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Overtime</th>
                      <th>Late</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((att: any, index: number) => (
                      <tr key={`table-${att.id}-${index}`}>
                        <td>
                          <Link href={`/hr/employees/${att.employee_id}`} className="hover:underline">
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{att.employee_name}</span>
                          </Link>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{att.department_name}</p>
                        </td>
                        <td style={{ fontSize: '13px' }}>{att.shift_id}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{att.first_in || '-'}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{att.last_out || '-'}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{att.total_hours > 0 ? `${att.total_hours}h` : '-'}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500, color: att.overtime_hours > 0 ? '#F59E0B' : '#a3a3a3' }}>{att.overtime_hours > 0 ? `${att.overtime_hours}h` : '-'}</td>
                        <td style={{ fontSize: '13px', color: att.late_minutes > 0 ? '#EF4444' : '#a3a3a3' }}>{att.late_minutes > 0 ? `${att.late_minutes}m` : '-'}</td>
                        <td>
                          <span className="tibbna-badge" style={{
                            backgroundColor: att.status === 'PRESENT' ? '#D1FAE5' : att.status === 'LEAVE' ? '#FEF3C7' : '#FEE2E2',
                            color: att.status === 'PRESENT' ? '#065F46' : att.status === 'LEAVE' ? '#92400E' : '#991B1B'
                          }}>{att.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {filtered.map((att: any, index: number) => (
                  <div key={`mobile-${att.id}-${index}`} style={{ padding: '10px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{att.employee_name}</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{att.department_name}</p>
                      </div>
                      <span className="tibbna-badge" style={{
                        backgroundColor: att.status === 'PRESENT' ? '#D1FAE5' : att.status === 'LEAVE' ? '#FEF3C7' : '#FEE2E2',
                        color: att.status === 'PRESENT' ? '#065F46' : att.status === 'LEAVE' ? '#92400E' : '#991B1B'
                      }}>{att.status}</span>
                    </div>
                    {att.first_in && (
                      <div className="grid grid-cols-3 gap-2" style={{ fontSize: '12px' }}>
                        <div><span style={{ color: '#a3a3a3' }}>In:</span> <span style={{ fontWeight: 500 }}>{att.first_in}</span></div>
                        <div><span style={{ color: '#a3a3a3' }}>Out:</span> <span style={{ fontWeight: 500 }}>{att.last_out || '-'}</span></div>
                        <div><span style={{ color: '#a3a3a3' }}>Hours:</span> <span style={{ fontWeight: 500 }}>{att.total_hours}h</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Recent Activity</h3></div>
          <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentActivity.map((att: any, idx: number) => (
              <div key={att.id} className="flex items-center justify-between py-3" style={{ borderBottom: idx < recentActivity.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: att.last_out ? '#DBEAFE' : '#D1FAE5' }}>
                    {att.last_out ? <LogOut size={16} style={{ color: '#1D4ED8' }} /> : <LogIn size={16} style={{ color: '#065F46' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{att.employee_name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{att.employee_number || att.employee_id} • {att.last_out ? 'Checked Out' : 'Checked In'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{att.last_out || att.first_in}</p>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{att.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Monthly Summary - {monthly.month}</h3></div>
        <div className="tibbna-card-content">
          <div className="tibbna-grid-4">
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>{monthly.average_attendance_rate}%</p>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Avg Attendance Rate</p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{monthly.total_overtime_hours}</p>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Total Overtime Hours</p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#EF4444' }}>{monthly.total_absent_days}</p>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Total Absent Days</p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#6366F1' }}>{monthly.total_late_arrivals}</p>
              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Late Arrivals</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
