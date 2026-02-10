'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, BarChart3, Users, Clock, TrendingUp,
  AlertTriangle, Calendar, RotateCcw
} from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { Employee, DailyAttendanceSummary } from '@/types/hr';

// ============================================================================
// TYPES
// ============================================================================
type ReportTab = 'overview' | 'employee' | 'department' | 'late' | 'overtime';
type DatePreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'custom';

interface DeptRow {
  department: string;
  employeeCount: number;
  totalDays: number;
  presentCount: number;
  lateCount: number;
  attendanceRate: string;
  punctualityRate: string;
  totalOvertimeHours: string;
}

interface LateRow {
  employeeId: string;
  employeeName: string;
  department: string;
  lateCount: number;
  avgLateMinutes: string;
  totalLateMinutes: number;
}

interface OvertimeRow {
  employeeId: string;
  employeeName: string;
  department: string;
  totalOvertimeHours: string;
  overtimeDays: number;
  avgOvertimePerDay: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const TABS: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview',   label: 'Overview',       icon: BarChart3 },
  { key: 'employee',   label: 'By Employee',    icon: Users },
  { key: 'department', label: 'By Department',  icon: Users },
  { key: 'late',       label: 'Late Arrivals',  icon: AlertTriangle },
  { key: 'overtime',   label: 'Overtime',        icon: Clock },
];

export default function AttendanceReportsPage() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summaries, setSummaries] = useState<DailyAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      const emps = dataStore.getEmployees();
      // Use processed summaries first; fall back to static daily_summaries
      let sums = dataStore.getProcessedSummaries();
      if (!sums.length) sums = dataStore.getDailySummaries();
      setEmployees(emps);
      setSummaries(sums);
    } catch (err) {
      console.error('Error loading report data:', err);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DATE RANGE
  // =========================================================================
  const dateBounds = useCallback((): { start: string; end: string } => {
    const now = new Date();
    let s: Date;
    let e: Date = new Date(now);

    switch (datePreset) {
      case 'thisMonth':
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        s = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last6Months':
        s = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'thisYear':
        s = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customStart && customEnd) return { start: customStart, end: customEnd };
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        s = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
  }, [datePreset, customStart, customEnd]);

  // =========================================================================
  // DERIVED
  // =========================================================================
  const departments = useMemo(
    () => [...new Set(employees.map(e => e.department_name).filter(Boolean))].sort(),
    [employees]
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
  // FILTERED SUMMARIES
  // =========================================================================
  const filtered = useMemo(() => {
    const { start, end } = dateBounds();
    let data = summaries.filter(s => s.date >= start && s.date <= end);
    if (selectedEmployee !== 'all') data = data.filter(s => s.employee_id === selectedEmployee);
    if (selectedDept !== 'all') data = data.filter(s => {
      const emp = getEmp(s.employee_id);
      return emp?.department_name === selectedDept;
    });
    return data;
  }, [summaries, dateBounds, selectedEmployee, selectedDept, getEmp]);

  // =========================================================================
  // OVERVIEW METRICS
  // =========================================================================
  const overview = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
    const absent = filtered.filter(s => s.status === 'ABSENT').length;
    const leave = filtered.filter(s => s.status === 'LEAVE').length;
    const late = filtered.filter(s => (s.late_minutes ?? 0) > 0).length;
    const hrs = filtered.reduce((a, s) => a + (s.total_hours || 0), 0);
    const ot = filtered.reduce((a, s) => a + (s.overtime_hours || 0), 0);
    const lateMins = filtered.reduce((a, s) => a + (s.late_minutes || 0), 0);
    return {
      total, present, absent, leave, late,
      hours: hrs.toFixed(1),
      overtime: ot.toFixed(1),
      lateMins,
      attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0',
      punctuality: total > 0 ? (((total - late) / total) * 100).toFixed(1) : '0.0',
      avgHrs: total > 0 ? (hrs / total).toFixed(1) : '0.0',
    };
  }, [filtered]);

  // =========================================================================
  // EMPLOYEE REPORT
  // =========================================================================
  const empReport = useMemo(() => {
    if (selectedEmployee === 'all') return null;
    const emp = getEmp(selectedEmployee);
    if (!emp) return null;
    const rows = filtered.filter(s => s.employee_id === selectedEmployee);
    const total = rows.length;
    const present = rows.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
    const absent = rows.filter(s => s.status === 'ABSENT').length;
    const leave = rows.filter(s => s.status === 'LEAVE').length;
    const late = rows.filter(s => (s.late_minutes ?? 0) > 0).length;
    const hrs = rows.reduce((a, s) => a + (s.total_hours || 0), 0);
    const ot = rows.reduce((a, s) => a + (s.overtime_hours || 0), 0);
    const avgLate = late > 0 ? (rows.reduce((a, s) => a + (s.late_minutes || 0), 0) / late).toFixed(0) : '0';
    return {
      emp, total, present, absent, leave, late,
      hours: hrs.toFixed(1), overtime: ot.toFixed(1), avgLate,
      attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0',
      punctuality: total > 0 ? (((total - late) / total) * 100).toFixed(1) : '0.0',
    };
  }, [selectedEmployee, filtered, getEmp]);

  // =========================================================================
  // DEPARTMENT REPORT
  // =========================================================================
  const deptReport = useMemo((): DeptRow[] => {
    return departments.map(dept => {
      const deptEmps = employees.filter(e => e.department_name === dept);
      const rows = filtered.filter(s => { const e = getEmp(s.employee_id); return e?.department_name === dept; });
      const total = rows.length;
      const present = rows.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
      const late = rows.filter(s => (s.late_minutes ?? 0) > 0).length;
      const ot = rows.reduce((a, s) => a + (s.overtime_hours || 0), 0);
      return {
        department: dept,
        employeeCount: deptEmps.length,
        totalDays: total,
        presentCount: present,
        lateCount: late,
        attendanceRate: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0',
        punctualityRate: total > 0 ? (((total - late) / total) * 100).toFixed(1) : '0.0',
        totalOvertimeHours: ot.toFixed(1),
      };
    }).filter(d => d.totalDays > 0).sort((a, b) => parseFloat(b.attendanceRate) - parseFloat(a.attendanceRate));
  }, [departments, employees, filtered, getEmp]);

  // =========================================================================
  // LATE ARRIVALS TOP 10
  // =========================================================================
  const lateTop = useMemo((): LateRow[] => {
    const map: Record<string, { count: number; mins: number }> = {};
    filtered.filter(s => (s.late_minutes ?? 0) > 0).forEach(s => {
      if (!map[s.employee_id]) map[s.employee_id] = { count: 0, mins: 0 };
      map[s.employee_id].count++;
      map[s.employee_id].mins += s.late_minutes || 0;
    });
    return Object.entries(map)
      .map(([id, d]) => ({
        employeeId: id,
        employeeName: empName(id),
        department: getEmp(id)?.department_name || '-',
        lateCount: d.count,
        avgLateMinutes: (d.mins / d.count).toFixed(0),
        totalLateMinutes: d.mins,
      }))
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 10);
  }, [filtered, empName, getEmp]);

  // =========================================================================
  // OVERTIME TOP 10
  // =========================================================================
  const otTop = useMemo((): OvertimeRow[] => {
    const map: Record<string, { hrs: number; days: number }> = {};
    filtered.filter(s => (s.overtime_hours || 0) > 0).forEach(s => {
      if (!map[s.employee_id]) map[s.employee_id] = { hrs: 0, days: 0 };
      map[s.employee_id].hrs += s.overtime_hours || 0;
      map[s.employee_id].days++;
    });
    return Object.entries(map)
      .map(([id, d]) => ({
        employeeId: id,
        employeeName: empName(id),
        department: getEmp(id)?.department_name || '-',
        totalOvertimeHours: d.hrs.toFixed(1),
        overtimeDays: d.days,
        avgOvertimePerDay: (d.hrs / d.days).toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.totalOvertimeHours) - parseFloat(a.totalOvertimeHours))
      .slice(0, 10);
  }, [filtered, empName, getEmp]);

  // =========================================================================
  // CSV EXPORT
  // =========================================================================
  const handleExport = useCallback(() => {
    try {
      let rows: string[][] = [];
      let filename = '';
      const ts = new Date().toISOString().split('T')[0];

      switch (activeTab) {
        case 'overview':
          filename = `attendance_overview_${ts}.csv`;
          rows = [
            ['Metric', 'Value'],
            ['Total Working Days', String(overview.total)],
            ['Present Days', String(overview.present)],
            ['Absent Days', String(overview.absent)],
            ['Leave Days', String(overview.leave)],
            ['Late Arrivals', String(overview.late)],
            ['Attendance Rate', overview.attendanceRate + '%'],
            ['Punctuality Rate', overview.punctuality + '%'],
            ['Total Hours', overview.hours],
            ['Total Overtime Hours', overview.overtime],
            ['Avg Hours/Day', overview.avgHrs],
          ];
          break;
        case 'department':
          filename = `attendance_by_department_${ts}.csv`;
          rows = [
            ['Department', 'Employees', 'Working Days', 'Present', 'Late', 'Attendance %', 'Punctuality %', 'Overtime Hrs'],
            ...deptReport.map(d => [d.department, String(d.employeeCount), String(d.totalDays), String(d.presentCount), String(d.lateCount), d.attendanceRate + '%', d.punctualityRate + '%', d.totalOvertimeHours]),
          ];
          break;
        case 'late':
          filename = `late_arrivals_${ts}.csv`;
          rows = [
            ['Employee', 'Department', 'Late Count', 'Avg Late (min)', 'Total Late (min)'],
            ...lateTop.map(l => [l.employeeName, l.department, String(l.lateCount), l.avgLateMinutes, String(l.totalLateMinutes)]),
          ];
          break;
        case 'overtime':
          filename = `overtime_analysis_${ts}.csv`;
          rows = [
            ['Employee', 'Department', 'Total OT Hours', 'OT Days', 'Avg OT/Day'],
            ...otTop.map(o => [o.employeeName, o.department, o.totalOvertimeHours, String(o.overtimeDays), o.avgOvertimePerDay]),
          ];
          break;
        case 'employee':
          if (empReport) {
            filename = `employee_attendance_${empReport.emp.id}_${ts}.csv`;
            rows = [
              ['Metric', 'Value'],
              ['Employee', `${empReport.emp.first_name} ${empReport.emp.last_name}`],
              ['Department', empReport.emp.department_name],
              ['Working Days', String(empReport.total)],
              ['Present', String(empReport.present)],
              ['Absent', String(empReport.absent)],
              ['Leave', String(empReport.leave)],
              ['Late', String(empReport.late)],
              ['Attendance Rate', empReport.attendanceRate + '%'],
              ['Punctuality Rate', empReport.punctuality + '%'],
              ['Total Hours', empReport.hours],
              ['Overtime Hours', empReport.overtime],
              ['Avg Late (min)', empReport.avgLate],
            ];
          }
          break;
      }

      if (!rows.length) { toast.error('No data to export'); return; }

      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported', { description: filename });
    } catch {
      toast.error('Export failed');
    }
  }, [activeTab, overview, deptReport, lateTop, otTop, empReport]);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  const pctBar = (value: string, color: string) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '12px', color: '#374151' }}>{value}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${value}%`, backgroundColor: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  // =========================================================================
  // RENDER
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading reports…</p>
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
          <Link href="/hr/attendance"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Attendance Reports</h2>
            <p className="page-description">Comprehensive attendance analytics and insights</p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-1.5">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ================================================================= */}
      {/* REPORT TABS                                                       */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap"
                style={{
                  fontSize: '13px',
                  backgroundColor: activeTab === tab.key ? '#618FF5' : '#F3F4F6',
                  color: activeTab === tab.key ? '#fff' : '#374151',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* FILTERS                                                           */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date range */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '3px' }}>Date Range</label>
              <select className="tibbna-input" value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)}>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="last3Months">Last 3 Months</option>
                <option value="last6Months">Last 6 Months</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '3px' }}>Start Date</label>
                  <input type="date" className="tibbna-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '3px' }}>End Date</label>
                  <input type="date" className="tibbna-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              </>
            )}

            {/* Department (not on department tab) */}
            {activeTab !== 'department' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '3px' }}>Department</label>
                <select className="tibbna-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                  <option value="all">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Employee (on employee tab) */}
            {activeTab === 'employee' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '3px' }}>Employee</label>
                <select className="tibbna-input" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                  <option value="all">Select Employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === 'overview' && (
        <>
          {/* KPI cards */}
          <div className="tibbna-grid-4 tibbna-section">
            {[
              { label: 'Attendance Rate', value: `${overview.attendanceRate}%`, sub: `${overview.present} / ${overview.total} days`, icon: TrendingUp, iconColor: '#059669', iconBg: '#D1FAE5', valueColor: '#059669' },
              { label: 'Punctuality Rate', value: `${overview.punctuality}%`, sub: `${overview.late} late arrivals`, icon: Clock, iconColor: '#2563EB', iconBg: '#DBEAFE', valueColor: '#2563EB' },
              { label: 'Total Hours', value: overview.hours, sub: `${overview.avgHrs} hrs/day avg`, icon: Calendar, iconColor: '#6B7280', iconBg: '#F3F4F6', valueColor: '#111827' },
              { label: 'Overtime Hours', value: overview.overtime, sub: 'total overtime', icon: Clock, iconColor: '#F59E0B', iconBg: '#FEF3C7', valueColor: '#F59E0B' },
            ].map(kpi => (
              <div key={kpi.label} className="tibbna-card">
                <div className="tibbna-card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>{kpi.label}</p>
                      <p style={{ fontSize: '22px', fontWeight: 700, color: kpi.valueColor }}>{kpi.value}</p>
                      <p style={{ fontSize: '11px', color: '#6B7280' }}>{kpi.sub}</p>
                    </div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <kpi.icon size={22} style={{ color: kpi.iconColor }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown + Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-card-title">Attendance Breakdown</h3></div>
              <div className="tibbna-card-content space-y-3">
                {[
                  { label: 'Present', value: overview.present, color: '#059669' },
                  { label: 'Absent', value: overview.absent, color: '#DC2626' },
                  { label: 'On Leave', value: overview.leave, color: '#F59E0B' },
                  { label: 'Late (included in Present)', value: overview.late, color: '#6B7280' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between" style={{ fontSize: '13px' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color }} />
                      <span style={{ color: '#374151' }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: item.color }}>{item.value} days</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E5E7EB', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Total Records</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{overview.total} days</span>
                </div>
              </div>
            </div>

            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-card-title">Performance Metrics</h3></div>
              <div className="tibbna-card-content space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: '12px' }}>
                    <span style={{ color: '#374151' }}>Attendance Rate</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>{overview.attendanceRate}%</span>
                  </div>
                  {pctBar(overview.attendanceRate, '#059669')}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: '12px' }}>
                    <span style={{ color: '#374151' }}>Punctuality Rate</span>
                    <span style={{ fontWeight: 600, color: '#2563EB' }}>{overview.punctuality}%</span>
                  </div>
                  {pctBar(overview.punctuality, '#2563EB')}
                </div>
                <div style={{ paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                  <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
                    <div><p style={{ color: '#6B7280' }}>Total Late Minutes</p><p style={{ fontWeight: 700, color: '#DC2626' }}>{overview.lateMins}</p></div>
                    <div><p style={{ color: '#6B7280' }}>Avg Hours/Day</p><p style={{ fontWeight: 700 }}>{overview.avgHrs}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* EMPLOYEE TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === 'employee' && empReport && (
        <>
          <div className="tibbna-card tibbna-section">
            <div className="tibbna-card-header">
              <div className="flex items-center gap-3">
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#DBEAFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#2563EB',
                }}>
                  {empReport.emp.first_name[0]}{empReport.emp.last_name[0]}
                </div>
                <div>
                  <h3 className="tibbna-card-title">{empReport.emp.first_name} {empReport.emp.last_name}</h3>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>{empReport.emp.department_name} — {empReport.emp.job_title}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="tibbna-grid-4 tibbna-section">
            {[
              { label: 'Working Days', value: empReport.total, color: '#111827' },
              { label: 'Present', value: empReport.present, sub: `${empReport.attendanceRate}% rate`, color: '#059669' },
              { label: 'Late Arrivals', value: empReport.late, sub: `${empReport.avgLate} min avg`, color: '#F59E0B' },
              { label: 'Overtime', value: empReport.overtime, sub: 'hours', color: '#2563EB' },
            ].map(kpi => (
              <div key={kpi.label} className="tibbna-card">
                <div className="tibbna-card-content">
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>{kpi.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
                  {kpi.sub && <p style={{ fontSize: '11px', color: '#6B7280' }}>{kpi.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Employee breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-card-title">Day Breakdown</h3></div>
              <div className="tibbna-card-content space-y-3" style={{ fontSize: '13px' }}>
                {[
                  { label: 'Present', value: empReport.present, color: '#059669' },
                  { label: 'Absent', value: empReport.absent, color: '#DC2626' },
                  { label: 'On Leave', value: empReport.leave, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color }} />
                      <span style={{ color: '#374151' }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-card-title">Rates</h3></div>
              <div className="tibbna-card-content space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: '12px' }}>
                    <span>Attendance</span><span style={{ fontWeight: 600, color: '#059669' }}>{empReport.attendanceRate}%</span>
                  </div>
                  {pctBar(empReport.attendanceRate, '#059669')}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: '12px' }}>
                    <span>Punctuality</span><span style={{ fontWeight: 600, color: '#2563EB' }}>{empReport.punctuality}%</span>
                  </div>
                  {pctBar(empReport.punctuality, '#2563EB')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'employee' && !empReport && (
        <div className="tibbna-card">
          <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px' }}>
            <Users size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ color: '#6B7280', fontSize: '13px' }}>Select an employee above to view their attendance report</p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DEPARTMENT TAB                                                    */}
      {/* ================================================================= */}
      {activeTab === 'department' && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-card-title">Department Comparison</h3>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{deptReport.length} department(s)</span>
          </div>
          <div className="tibbna-card-content" style={{ padding: 0 }}>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Employees</th>
                    <th style={{ textAlign: 'center' }}>Working Days</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Late</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                    <th style={{ textAlign: 'center' }}>Punctuality %</th>
                    <th style={{ textAlign: 'center' }}>OT Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {deptReport.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3' }}>No data for selected period</td></tr>
                  ) : deptReport.map(d => (
                    <tr key={d.department}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{d.department}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>{d.employeeCount}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>{d.totalDays}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: '#059669' }}>{d.presentCount}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: '#F59E0B' }}>{d.lateCount}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46' }}>
                          {d.attendanceRate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                          {d.punctualityRate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: '#2563EB' }}>{d.totalOvertimeHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {deptReport.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '24px' }}>No data</p>
              ) : deptReport.map(d => (
                <div key={d.department} style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>{d.department}</p>
                  <div className="grid grid-cols-4 gap-2" style={{ fontSize: '11px', textAlign: 'center' }}>
                    <div><p style={{ color: '#6B7280' }}>Emps</p><p style={{ fontWeight: 600 }}>{d.employeeCount}</p></div>
                    <div><p style={{ color: '#6B7280' }}>Present</p><p style={{ fontWeight: 600, color: '#059669' }}>{d.presentCount}</p></div>
                    <div><p style={{ color: '#6B7280' }}>Late</p><p style={{ fontWeight: 600, color: '#F59E0B' }}>{d.lateCount}</p></div>
                    <div><p style={{ color: '#6B7280' }}>OT Hrs</p><p style={{ fontWeight: 600, color: '#2563EB' }}>{d.totalOvertimeHours}</p></div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: '#D1FAE5', color: '#065F46' }}>{d.attendanceRate}%</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{d.punctualityRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LATE ARRIVALS TAB                                                 */}
      {/* ================================================================= */}
      {activeTab === 'late' && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-card-title">Top 10 Late Arrivals</h3>
          </div>
          <div className="tibbna-card-content" style={{ padding: 0 }}>
            <div className="hidden md:block overflow-x-auto">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Late Count</th>
                    <th style={{ textAlign: 'center' }}>Avg Late (min)</th>
                    <th style={{ textAlign: 'center' }}>Total Late (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {lateTop.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3' }}>No late arrivals in selected period</td></tr>
                  ) : lateTop.map((row, i) => (
                    <tr key={row.employeeId}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: i < 3 ? '#DC2626' : '#6B7280' }}>#{i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{row.employeeName}</td>
                      <td style={{ fontSize: '12px', color: '#6B7280' }}>{row.department}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#F59E0B' }}>{row.lateCount}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>{row.avgLateMinutes}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#DC2626' }}>{row.totalLateMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {lateTop.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '24px' }}>No late arrivals</p>
              ) : lateTop.map((row, i) => (
                <div key={row.employeeId} className="flex items-center gap-3" style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: i < 3 ? '#FEE2E2' : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: i < 3 ? '#DC2626' : '#6B7280', flexShrink: 0,
                  }}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{row.employeeName}</p>
                    <p style={{ fontSize: '10px', color: '#6B7280' }}>{row.department}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>{row.lateCount}x</p>
                    <p style={{ fontSize: '10px', color: '#DC2626' }}>{row.totalLateMinutes} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* OVERTIME TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === 'overtime' && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-card-title">Top 10 Overtime Workers</h3>
          </div>
          <div className="tibbna-card-content" style={{ padding: 0 }}>
            <div className="hidden md:block overflow-x-auto">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Total OT Hours</th>
                    <th style={{ textAlign: 'center' }}>OT Days</th>
                    <th style={{ textAlign: 'center' }}>Avg OT/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {otTop.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3' }}>No overtime recorded in selected period</td></tr>
                  ) : otTop.map((row, i) => (
                    <tr key={row.employeeId}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: i < 3 ? '#F59E0B' : '#6B7280' }}>#{i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{row.employeeName}</td>
                      <td style={{ fontSize: '12px', color: '#6B7280' }}>{row.department}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563EB' }}>{row.totalOvertimeHours}</td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>{row.overtimeDays}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#F59E0B' }}>{row.avgOvertimePerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {otTop.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '24px' }}>No overtime recorded</p>
              ) : otTop.map((row, i) => (
                <div key={row.employeeId} className="flex items-center gap-3" style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: i < 3 ? '#FEF3C7' : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: i < 3 ? '#F59E0B' : '#6B7280', flexShrink: 0,
                  }}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{row.employeeName}</p>
                    <p style={{ fontSize: '10px', color: '#6B7280' }}>{row.department}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>{row.totalOvertimeHours}h</p>
                    <p style={{ fontSize: '10px', color: '#6B7280' }}>{row.overtimeDays} days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
