'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Filter, BarChart3, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import employeesData from '@/data/hr/employees.json';
import attendanceData from '@/data/hr/attendance.json';

export default function AttendanceReportPage() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('monthly');
  const [showCharts, setShowCharts] = useState(true);

  const allEmployees = employeesData.employees;
  const summaries = attendanceData.daily_summaries;
  const deptNames = [...new Set(allEmployees.map(e => e.department_name))].sort();

  const monthlyData = useMemo(() => {
    const empMap = new Map<string, { name: string; dept: string; present: number; absent: number; leave: number; late: number; totalHours: number; overtimeHours: number }>();

    summaries.forEach(s => {
      const emp = allEmployees.find(e => e.id === s.employee_id);
      if (!emp) return;
      if (deptFilter !== 'all' && emp.department_name !== deptFilter) return;

      if (!empMap.has(s.employee_id)) {
        empMap.set(s.employee_id, { name: `${emp.first_name} ${emp.last_name}`, dept: emp.department_name, present: 0, absent: 0, leave: 0, late: 0, totalHours: 0, overtimeHours: 0 });
      }
      const entry = empMap.get(s.employee_id)!;
      if (s.status === 'PRESENT') entry.present++;
      else if (s.status === 'ABSENT') entry.absent++;
      else if (s.status === 'LEAVE') entry.leave++;
      if (s.late_minutes > 0) entry.late++;
      entry.totalHours += s.total_hours || 0;
      entry.overtimeHours += s.overtime_hours || 0;
    });

    // Add employees with no attendance records
    allEmployees.forEach(emp => {
      if (deptFilter !== 'all' && emp.department_name !== deptFilter) return;
      if (emp.employment_status !== 'ACTIVE') return;
      if (!empMap.has(emp.id)) {
        empMap.set(emp.id, { name: `${emp.first_name} ${emp.last_name}`, dept: emp.department_name, present: 22, absent: 0, leave: 0, late: 0, totalHours: 176, overtimeHours: 0 });
      }
    });

    return Array.from(empMap.entries()).map(([id, data]) => ({ employee_id: id, ...data }));
  }, [allEmployees, summaries, deptFilter]);

  const dailyData = useMemo(() => {
    let data = summaries;
    if (deptFilter !== 'all') {
      const deptEmpIds = allEmployees.filter(e => e.department_name === deptFilter).map(e => e.id);
      data = data.filter(s => deptEmpIds.includes(s.employee_id));
    }
    return data;
  }, [summaries, allEmployees, deptFilter]);

  const stats = useMemo(() => {
    const totalPresent = summaries.filter(s => s.status === 'PRESENT').length;
    const totalAbsent = summaries.filter(s => s.status === 'ABSENT').length;
    const totalRecords = summaries.length;
    const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : '0';
    const totalOvertime = summaries.reduce((s, a) => s + (a.overtime_hours || 0), 0);
    const totalLate = summaries.filter(s => s.late_minutes > 0).length;
    return { totalPresent, totalAbsent, attendanceRate, totalOvertime, totalLate };
  }, [summaries]);

  const byDepartment = useMemo(() => {
    const map: Record<string, { present: number; total: number }> = {};
    summaries.forEach(s => {
      const emp = allEmployees.find(e => e.id === s.employee_id);
      if (!emp) return;
      if (!map[emp.department_name]) map[emp.department_name] = { present: 0, total: 0 };
      map[emp.department_name].total++;
      if (s.status === 'PRESENT') map[emp.department_name].present++;
    });
    return Object.entries(map)
      .map(([dept, data]) => ({ dept, rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);
  }, [summaries, allEmployees]);

  const handleExport = () => {
    if (reportType === 'monthly') {
      const header = 'Employee,Department,Days Present,Days Absent,Days Leave,Late Count,Total Hours,Overtime Hours';
      const rows = monthlyData.map(d =>
        [d.name, d.dept, d.present, d.absent, d.leave, d.late, d.totalHours, d.overtimeHours].join(',')
      );
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance-report-monthly.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const header = 'Employee,Date,First In,Last Out,Total Hours,Overtime,Late Minutes,Status';
      const rows = dailyData.map(d => {
        const emp = allEmployees.find(e => e.id === d.employee_id);
        return [emp ? `${emp.first_name} ${emp.last_name}` : d.employee_id, d.date, d.first_in || '-', d.last_out || '-', d.total_hours, d.overtime_hours, d.late_minutes, d.status].join(',');
      });
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance-report-daily.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/reports"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Attendance Report</h2>
            <p className="page-description">Attendance analytics, trends, and data export</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn-primary flex items-center gap-1" style={{ fontSize: '12px' }} onClick={() => alert('Generating PDF... (simulated)')}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center gap-2 mb-3"><Filter size={14} style={{ color: '#525252' }} /><span style={{ fontSize: '13px', fontWeight: 600 }}>Filters</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="tibbna-input" value={reportType} onChange={e => setReportType(e.target.value as 'daily' | 'monthly')}>
              <option value="monthly">Monthly Summary</option>
              <option value="daily">Daily Detail</option>
            </select>
            <select className="tibbna-input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {deptNames.map(d => (<option key={d} value={d}>{d}</option>))}
            </select>
            <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setShowCharts(!showCharts)}>
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Attendance Rate</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.attendanceRate}%</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Absent</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{stats.totalAbsent}</p><p className="tibbna-card-subtitle">days</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total Overtime</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.totalOvertime}</p><p className="tibbna-card-subtitle">hours</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Late Arrivals</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{stats.totalLate}</p></div></div>
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><BarChart3 size={16} /> Department Attendance Rate</h3></div>
          <div className="tibbna-card-content">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={byDepartment.slice(0, 10).map(d => ({ name: d.dept.length > 14 ? d.dept.substring(0, 14) + '...' : d.dept, rate: d.rate }))} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance Rate']} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {byDepartment.slice(0, 10).map((d, i) => (
                      <Cell key={i} fill={d.rate >= 90 ? '#10B981' : d.rate >= 75 ? '#F59E0B' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>{reportType === 'monthly' ? 'Monthly Summary' : 'Daily Records'} ({reportType === 'monthly' ? monthlyData.length : dailyData.length} records)</h3></div>
        <div className="tibbna-card-content">
          {reportType === 'monthly' ? (
            <>
              <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tibbna-table">
                  <thead><tr><th>Employee</th><th>Department</th><th>Present</th><th>Absent</th><th>Leave</th><th>Late</th><th>Hours</th><th>Overtime</th></tr></thead>
                  <tbody>
                    {monthlyData.map(d => (
                      <tr key={d.employee_id}>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{d.name}</td>
                        <td style={{ fontSize: '12px', color: '#525252' }}>{d.dept}</td>
                        <td style={{ fontSize: '13px', color: '#10B981', fontWeight: 500 }}>{d.present}</td>
                        <td style={{ fontSize: '13px', color: d.absent > 0 ? '#EF4444' : '#a3a3a3' }}>{d.absent}</td>
                        <td style={{ fontSize: '13px', color: d.leave > 0 ? '#F59E0B' : '#a3a3a3' }}>{d.leave}</td>
                        <td style={{ fontSize: '13px', color: d.late > 0 ? '#6366F1' : '#a3a3a3' }}>{d.late}</td>
                        <td style={{ fontSize: '13px' }}>{d.totalHours}h</td>
                        <td style={{ fontSize: '13px', color: d.overtimeHours > 0 ? '#F59E0B' : '#a3a3a3', fontWeight: d.overtimeHours > 0 ? 500 : 400 }}>{d.overtimeHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {monthlyData.slice(0, 15).map(d => (
                  <div key={d.employee_id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{d.name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{d.dept}</p>
                    <div className="grid grid-cols-4 gap-2 mt-1" style={{ fontSize: '12px' }}>
                      <div><span style={{ color: '#a3a3a3' }}>Present</span><p style={{ color: '#10B981', fontWeight: 500 }}>{d.present}</p></div>
                      <div><span style={{ color: '#a3a3a3' }}>Absent</span><p style={{ color: '#EF4444' }}>{d.absent}</p></div>
                      <div><span style={{ color: '#a3a3a3' }}>Late</span><p style={{ color: '#6366F1' }}>{d.late}</p></div>
                      <div><span style={{ color: '#a3a3a3' }}>OT</span><p style={{ color: '#F59E0B' }}>{d.overtimeHours}h</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tibbna-table">
                  <thead><tr><th>Employee</th><th>Date</th><th>First In</th><th>Last Out</th><th>Hours</th><th>Overtime</th><th>Late</th><th>Status</th></tr></thead>
                  <tbody>
                    {dailyData.map(d => {
                      const emp = allEmployees.find(e => e.id === d.employee_id);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontSize: '13px', fontWeight: 500 }}>{emp ? `${emp.first_name} ${emp.last_name}` : d.employee_id}</td>
                          <td style={{ fontSize: '13px' }}>{d.date}</td>
                          <td style={{ fontSize: '13px' }}>{d.first_in || '-'}</td>
                          <td style={{ fontSize: '13px' }}>{d.last_out || '-'}</td>
                          <td style={{ fontSize: '13px' }}>{d.total_hours}h</td>
                          <td style={{ fontSize: '13px', color: d.overtime_hours > 0 ? '#F59E0B' : '#a3a3a3' }}>{d.overtime_hours}h</td>
                          <td style={{ fontSize: '13px', color: d.late_minutes > 0 ? '#EF4444' : '#a3a3a3' }}>{d.late_minutes > 0 ? `${d.late_minutes}m` : '-'}</td>
                          <td><span className="tibbna-badge" style={{ backgroundColor: d.status === 'PRESENT' ? '#D1FAE5' : d.status === 'LEAVE' ? '#FEF3C7' : '#FEE2E2', color: d.status === 'PRESENT' ? '#065F46' : d.status === 'LEAVE' ? '#92400E' : '#991B1B', fontSize: '10px' }}>{d.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {dailyData.slice(0, 15).map(d => {
                  const emp = allEmployees.find(e => e.id === d.employee_id);
                  return (
                    <div key={d.id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{emp ? `${emp.first_name} ${emp.last_name}` : d.employee_id}</span>
                        <span className="tibbna-badge" style={{ backgroundColor: d.status === 'PRESENT' ? '#D1FAE5' : '#FEE2E2', color: d.status === 'PRESENT' ? '#065F46' : '#991B1B', fontSize: '10px' }}>{d.status}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{d.date} | In: {d.first_in || '-'} | Out: {d.last_out || '-'} | {d.total_hours}h</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
