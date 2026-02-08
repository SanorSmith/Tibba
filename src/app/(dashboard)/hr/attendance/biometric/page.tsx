'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, CheckCircle, Clock, User, Search } from 'lucide-react';
import type { AttendanceTransaction } from '@/types/hr';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import employeesData from '@/data/hr/employees.json';

type ScanState = 'READY' | 'SCANNING' | 'SUCCESS' | 'ERROR';

interface RecentScan {
  employee_name: string;
  time: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
}

export default function BiometricPage() {
  const [scanState, setScanState] = useState<ScanState>('READY');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastScan, setLastScan] = useState<{ name: string; type: 'CHECK_IN' | 'CHECK_OUT'; time: string } | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([
    { employee_name: 'Ahmed Al-Rashidi', time: '07:45', type: 'CHECK_IN' },
    { employee_name: 'Fatima Hassan', time: '07:50', type: 'CHECK_IN' },
    { employee_name: 'Omar Al-Bayati', time: '07:55', type: 'CHECK_IN' },
    { employee_name: 'Zainab Al-Saadi', time: '08:02', type: 'CHECK_IN' },
    { employee_name: 'Mustafa Al-Janabi', time: '08:10', type: 'CHECK_IN' },
  ]);
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const filteredEmployees = searchTerm
    ? activeEmployees.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleScan = (employeeId?: string) => {
    const empId = employeeId || selectedEmployee || manualId;
    const emp = activeEmployees.find(e => e.id === empId || e.employee_number === empId);
    if (!emp) {
      setScanState('ERROR');
      setTimeout(() => setScanState('READY'), 2000);
      return;
    }

    setScanState('SCANNING');

    setTimeout(() => {
      const now = currentTime;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isCheckIn = now.getHours() < 12;
      const type = isCheckIn ? 'CHECK_IN' as const : 'CHECK_OUT' as const;

      setLastScan({ name: `${emp.first_name} ${emp.last_name}`, type, time: timeStr });
      setRecentScans(prev => [
        { employee_name: `${emp.first_name} ${emp.last_name}`, time: timeStr, type },
        ...prev.slice(0, 9),
      ]);
      setScanState('SUCCESS');
      setSelectedEmployee('');
      setManualId('');
      setSearchTerm('');

      setTimeout(() => setScanState('READY'), 3000);
    }, 1500);
  };

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/attendance">
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <h2 className="page-title">Biometric Attendance</h2>
            <p className="page-description">Fingerprint check-in / check-out simulation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scanner Panel */}
        <div className="lg:col-span-2">
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              {/* Live Clock */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>{timeStr}</p>
                <p style={{ fontSize: '14px', color: '#525252' }}>{dateStr}</p>
              </div>

              {/* Scanner Area */}
              <div className="flex flex-col items-center gap-6">
                <button
                  onClick={() => handleScan()}
                  disabled={scanState === 'SCANNING'}
                  className="flex flex-col items-center gap-3 transition-all"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    border: `4px solid ${scanState === 'SUCCESS' ? '#10B981' : scanState === 'ERROR' ? '#EF4444' : scanState === 'SCANNING' ? '#F59E0B' : '#618FF5'}`,
                    backgroundColor: scanState === 'SUCCESS' ? '#D1FAE5' : scanState === 'ERROR' ? '#FEE2E2' : scanState === 'SCANNING' ? '#FEF3C7' : '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: scanState === 'SCANNING' ? 'wait' : 'pointer',
                  }}
                >
                  {scanState === 'SUCCESS' ? (
                    <CheckCircle size={64} style={{ color: '#10B981' }} />
                  ) : scanState === 'SCANNING' ? (
                    <Fingerprint size={64} style={{ color: '#F59E0B', animation: 'pulse 1s infinite' }} />
                  ) : (
                    <Fingerprint size={64} style={{ color: '#618FF5' }} />
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  {scanState === 'READY' && (
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#525252' }}>
                      {selectedEmployee ? 'Tap to scan fingerprint' : 'Select employee or enter ID below'}
                    </p>
                  )}
                  {scanState === 'SCANNING' && (
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#F59E0B' }}>Scanning fingerprint...</p>
                  )}
                  {scanState === 'SUCCESS' && lastScan && (
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
                        {lastScan.type === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: 600 }}>{lastScan.name}</p>
                      <p style={{ fontSize: '14px', color: '#525252' }}>{lastScan.time}</p>
                    </div>
                  )}
                  {scanState === 'ERROR' && (
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#EF4444' }}>Employee not found. Try again.</p>
                  )}
                </div>
              </div>

              {/* Employee Selection */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #e4e4e4', paddingTop: '16px' }}>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setManualMode(false)}
                    className={`tibbna-tab ${!manualMode ? 'tibbna-tab-active' : ''}`}
                  >
                    Search Employee
                  </button>
                  <button
                    onClick={() => setManualMode(true)}
                    className={`tibbna-tab ${manualMode ? 'tibbna-tab-active' : ''}`}
                  >
                    Enter ID
                  </button>
                </div>

                {!manualMode ? (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
                      <input
                        className="tibbna-input pl-10"
                        style={{ width: '100%' }}
                        placeholder="Search by name or employee number..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setSelectedEmployee(''); }}
                      />
                    </div>
                    {searchTerm && filteredEmployees.length > 0 && (
                      <div style={{ border: '1px solid #e4e4e4', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                        {filteredEmployees.slice(0, 8).map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => { setSelectedEmployee(emp.id); setSearchTerm(`${emp.first_name} ${emp.last_name}`); handleScan(emp.id); }}
                            className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[#f5f5f5] transition-colors"
                            style={{ borderBottom: '1px solid #f0f0f0' }}
                          >
                            <EmployeeAvatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontSize: '13px', fontWeight: 500 }}>{emp.first_name} {emp.last_name}</p>
                              <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{emp.employee_number} | {emp.department_name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="tibbna-input flex-1"
                      placeholder="Enter Employee Number (e.g. EMP-2024-001)"
                      value={manualId}
                      onChange={e => setManualId(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
                    />
                    <button className="btn-primary" onClick={() => handleScan()}>Scan</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div>
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Recent Scans</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentScans.map((scan, i) => (
                <div key={i} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: scan.type === 'CHECK_IN' ? '#D1FAE5' : '#FEF3C7' }}
                  >
                    {scan.type === 'CHECK_IN' ? (
                      <CheckCircle size={14} style={{ color: '#065F46' }} />
                    ) : (
                      <Clock size={14} style={{ color: '#92400E' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{scan.employee_name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                      {scan.type === 'CHECK_IN' ? 'Checked In' : 'Checked Out'} at {scan.time}
                    </p>
                  </div>
                </div>
              ))}
              {recentScans.length === 0 && (
                <p style={{ fontSize: '13px', color: '#a3a3a3', textAlign: 'center', padding: '16px' }}>No scans yet today</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="tibbna-card" style={{ marginTop: '16px' }}>
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Today&apos;s Stats</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Total Check-ins</span>
                <span style={{ fontWeight: 600 }}>{recentScans.filter(s => s.type === 'CHECK_IN').length}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Total Check-outs</span>
                <span style={{ fontWeight: 600 }}>{recentScans.filter(s => s.type === 'CHECK_OUT').length}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Active Employees</span>
                <span style={{ fontWeight: 600 }}>{activeEmployees.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
