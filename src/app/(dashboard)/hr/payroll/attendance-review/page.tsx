'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle, Users, Search } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  department: string;
  role: string;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  night_shifts: number;
  late_count: number;
  early_departure_count: number;
  avg_daily_hours: number;
  total_records: number;
}

export default function AttendanceReviewPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadAttendance(selectedPeriod);
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const res = await fetch('/api/hr/payroll/periods');
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setPeriods(data.data);
        setSelectedPeriod(data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load periods:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (periodId: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/hr/payroll/attendance?period_id=${periodId}`);
      const data = await res.json();
      if (data.success) {
        setAttendanceData(data.data);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const departments = [...new Set(attendanceData.map(a => a.department).filter(Boolean))];

  const filteredData = attendanceData.filter(a => {
    const matchesSearch = a.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'all' || a.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const totalPresent = filteredData.reduce((s, a) => s + Number(a.present_days), 0);
  const totalAbsent = filteredData.reduce((s, a) => s + Number(a.absent_days), 0);
  const totalOvertime = filteredData.reduce((s, a) => s + Number(a.overtime_hours), 0);
  const totalLate = filteredData.reduce((s, a) => s + Number(a.late_count), 0);
  const employeesWithData = filteredData.filter(a => Number(a.total_records) > 0).length;

  const getAttendanceStatus = (a: AttendanceRecord): { label: string; color: string; bg: string } => {
    if (Number(a.total_records) === 0) return { label: 'No Data', color: '#6B7280', bg: '#F3F4F6' };
    if (Number(a.absent_days) > 3) return { label: 'Review', color: '#DC2626', bg: '#FEF2F2' };
    if (Number(a.late_count) > 3) return { label: 'Warning', color: '#D97706', bg: '#FFFBEB' };
    return { label: 'OK', color: '#16A34A', bg: '#F0FDF4' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Attendance Review</h2>
            <p className="page-description">Review employee attendance before payroll calculation</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Payroll Period</label>
              <select
                className="tibbna-input"
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.period_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Department</label>
              <select
                className="tibbna-input"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  className="tibbna-input"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title"><Users size={14} style={{ display: 'inline', marginRight: '4px' }} />Employees</p>
            <p className="tibbna-card-value">{filteredData.length}</p>
            <p className="tibbna-card-subtitle">{employeesWithData} with attendance data</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title"><CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', color: '#16A34A' }} />Present Days</p>
            <p className="tibbna-card-value" style={{ color: '#16A34A' }}>{totalPresent}</p>
            <p className="tibbna-card-subtitle">Total across all employees</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title"><AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', color: '#DC2626' }} />Absent Days</p>
            <p className="tibbna-card-value" style={{ color: '#DC2626' }}>{totalAbsent}</p>
            <p className="tibbna-card-subtitle">{totalLate} late arrivals</p>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <p className="tibbna-card-title"><Clock size={14} style={{ display: 'inline', marginRight: '4px', color: '#2563EB' }} />Overtime Hours</p>
            <p className="tibbna-card-value" style={{ color: '#2563EB' }}>{Number(totalOvertime).toFixed(1)}</p>
            <p className="tibbna-card-subtitle">Total overtime this period</p>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            <Calendar size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Employee Attendance ({filteredData.length})
          </h3>
        </div>
        <div className="tibbna-card-content">
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ fontSize: '14px' }}>Loading attendance data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
              <Calendar size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>No attendance records found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="tibbna-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'center' }}>Present</th>
                      <th style={{ textAlign: 'center' }}>Absent</th>
                      <th style={{ textAlign: 'center' }}>Leave</th>
                      <th style={{ textAlign: 'center' }}>Overtime (hrs)</th>
                      <th style={{ textAlign: 'center' }}>Night Shifts</th>
                      <th style={{ textAlign: 'center' }}>Late</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map(a => {
                      const status = getAttendanceStatus(a);
                      return (
                        <tr key={a.employee_id}>
                          <td>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>{a.employee_name}</p>
                            <p style={{ fontSize: '10px', color: '#9CA3AF' }}>{a.role}</p>
                          </td>
                          <td style={{ fontSize: '12px' }}>{a.department || '-'}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#16A34A' }}>{a.present_days}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: Number(a.absent_days) > 0 ? '#DC2626' : '#6B7280' }}>{a.absent_days}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px', color: '#2563EB' }}>{a.leave_days}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: Number(a.overtime_hours) > 0 ? 600 : 400, color: Number(a.overtime_hours) > 0 ? '#7C3AED' : '#6B7280' }}>{Number(a.overtime_hours).toFixed(1)}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px' }}>{a.night_shifts}</td>
                          <td style={{ textAlign: 'center', fontSize: '13px', color: Number(a.late_count) > 0 ? '#D97706' : '#6B7280' }}>{a.late_count}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              color: status.color,
                              background: status.bg,
                            }}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {filteredData.slice(0, 20).map(a => {
                  const status = getAttendanceStatus(a);
                  return (
                    <div key={a.employee_id} style={{ padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>{a.employee_name}</p>
                          <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{a.department} | {a.role}</p>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
                          color: status.color, background: status.bg,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2" style={{ fontSize: '11px' }}>
                        <div><span style={{ color: '#9CA3AF' }}>Present</span><br /><strong style={{ color: '#16A34A' }}>{a.present_days}</strong></div>
                        <div><span style={{ color: '#9CA3AF' }}>Absent</span><br /><strong style={{ color: '#DC2626' }}>{a.absent_days}</strong></div>
                        <div><span style={{ color: '#9CA3AF' }}>OT hrs</span><br /><strong style={{ color: '#7C3AED' }}>{Number(a.overtime_hours).toFixed(1)}</strong></div>
                        <div><span style={{ color: '#9CA3AF' }}>Late</span><br /><strong style={{ color: '#D97706' }}>{a.late_count}</strong></div>
                      </div>
                    </div>
                  );
                })}
                {filteredData.length > 20 && (
                  <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>+{filteredData.length - 20} more employees</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
