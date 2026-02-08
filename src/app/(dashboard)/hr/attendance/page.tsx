'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, UserCheck, UserX, AlertTriangle, Timer, Calendar } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import attendanceData from '@/data/hr/attendance.json';

export default function AttendancePage() {
  const [filter, setFilter] = useState('all');
  const summaries = attendanceData.daily_summaries;
  const monthly = attendanceData.monthly_summary;

  const filtered = filter === 'all' ? summaries :
    summaries.filter(s => s.status === filter);

  const present = summaries.filter(s => s.status === 'PRESENT').length;
  const absent = summaries.filter(s => s.status === 'ABSENT').length;
  const onLeave = summaries.filter(s => s.status === 'LEAVE').length;
  const lateArrivals = summaries.filter(s => s.late_minutes > 0).length;

  const getEmployee = (id: string) => employeesData.employees.find(e => e.id === id);

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Attendance & Time Tracking</h2>
          <p className="page-description">Daily attendance for {summaries[0]?.date || 'today'}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Present</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{present}</p>
                <p className="tibbna-card-subtitle">{((present / summaries.length) * 100).toFixed(0)}% rate</p>
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
                <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{absent}</p>
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
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{onLeave}</p>
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
                <p className="tibbna-card-value" style={{ color: '#6366F1' }}>{lateArrivals}</p>
                <p className="tibbna-card-subtitle">Today</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <AlertTriangle size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {[{ v: 'all', l: 'All' }, { v: 'PRESENT', l: 'Present' }, { v: 'ABSENT', l: 'Absent' }, { v: 'LEAVE', l: 'On Leave' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`tibbna-tab ${filter === f.v ? 'tibbna-tab-active' : ''}`}>{f.l}</button>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Attendance Records</h3></div>
        <div className="tibbna-card-content">
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
                {filtered.map(att => {
                  const emp = getEmployee(att.employee_id);
                  if (!emp) return null;
                  return (
                    <tr key={att.id}>
                      <td>
                        <Link href={`/hr/employees/${emp.id}`} className="hover:underline">
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{emp.first_name} {emp.last_name}</span>
                        </Link>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{emp.department_name}</p>
                      </td>
                      <td style={{ fontSize: '13px' }}>{att.shift_id.replace('SHIFT-', '')}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {filtered.map(att => {
              const emp = getEmployee(att.employee_id);
              if (!emp) return null;
              return (
                <div key={att.id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{emp.first_name} {emp.last_name}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{emp.department_name}</p>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Monthly Summary - {monthly.month}</h3></div>
        <div className="tibbna-card-content">
          <div className="tibbna-grid-4">
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>{monthly.avg_attendance_rate}%</p>
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
