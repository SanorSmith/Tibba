'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, CheckCircle, Clock, User, Search, LogIn, LogOut } from 'lucide-react';
import type { AttendanceTransaction, Employee } from '@/types/hr';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';

type ScanState = 'READY' | 'SCANNING' | 'SUCCESS' | 'ERROR';

export default function BiometricPage() {
  const [scanState, setScanState] = useState<ScanState>('READY');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastScan, setLastScan] = useState<{ name: string; type: 'CHECK_IN' | 'CHECK_OUT'; time: string } | null>(null);
  const [transactions, setTransactions] = useState<AttendanceTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(true);

  // =========================================================================
  // LOAD DATA
  // =========================================================================

  useEffect(() => {
    try {
      const emps = dataStore.getEmployees();
      const txns = dataStore.getAttendanceTransactions();
      setEmployees(emps);
      setTransactions(txns);
    } catch (error) {
      console.error('Error loading biometric data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // =========================================================================
  // DERIVED DATA
  // =========================================================================

  const activeEmployees = useMemo(() =>
    employees.filter(e => (e as any).employment_status === 'ACTIVE'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return [];
    return activeEmployees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeEmployees, searchTerm]);

  const today = new Date().toISOString().split('T')[0];

  const todayTransactions = useMemo(() =>
    transactions
      .filter(t => t.transaction_date === today)
      .sort((a, b) => b.transaction_time.localeCompare(a.transaction_time)),
    [transactions, today]
  );

  const todayCheckIns = todayTransactions.filter(t => t.transaction_type === 'CHECK_IN').length;
  const todayCheckOuts = todayTransactions.filter(t => t.transaction_type === 'CHECK_OUT').length;

  // =========================================================================
  // TRANSACTION HELPERS
  // =========================================================================

  const getLastTransaction = (employeeId: string): AttendanceTransaction | null => {
    const empTxns = transactions
      .filter(t => t.employee_id === employeeId && t.transaction_date === today)
      .sort((a, b) => b.transaction_time.localeCompare(a.transaction_time));
    return empTxns.length > 0 ? empTxns[0] : null;
  };

  const canCheckIn = (employeeId: string): boolean => {
    const last = getLastTransaction(employeeId);
    return !last || last.transaction_type === 'CHECK_OUT';
  };

  const canCheckOut = (employeeId: string): boolean => {
    const last = getLastTransaction(employeeId);
    return last !== null && last.transaction_type === 'CHECK_IN';
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id || e.employee_number === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : id;
  };

  // =========================================================================
  // SCAN HANDLER
  // =========================================================================

  const handleScan = (employeeId?: string) => {
    const empId = employeeId || selectedEmployee || manualId;
    const emp = activeEmployees.find(e => e.id === empId || e.employee_number === empId);
    if (!emp) {
      setScanState('ERROR');
      toast.error('Employee not found');
      setTimeout(() => setScanState('READY'), 2000);
      return;
    }

    // Determine transaction type based on last transaction
    const isCheckIn = canCheckIn(emp.id);
    const type: 'CHECK_IN' | 'CHECK_OUT' = isCheckIn ? 'CHECK_IN' : 'CHECK_OUT';

    // Validate: if trying to check out but hasn't checked in
    if (!isCheckIn && !canCheckOut(emp.id)) {
      setScanState('ERROR');
      toast.error(`${emp.first_name} ${emp.last_name} must check in first`);
      setTimeout(() => setScanState('READY'), 2000);
      return;
    }

    setScanState('SCANNING');

    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const txn: AttendanceTransaction = {
        transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        transaction_date: today,
        transaction_time: `${timeStr}:${String(now.getSeconds()).padStart(2, '0')}`,
        transaction_type: type,
        device_id: 'BIO-001',
        entry_method: 'BIOMETRIC',
        is_manual_entry: false,
      };

      const success = dataStore.addAttendanceTransaction(txn);

      if (success) {
        setTransactions(prev => [...prev, txn]);
        setLastScan({ name: `${emp.first_name} ${emp.last_name}`, type, time: timeStr });
        setScanState('SUCCESS');
        toast.success(`${emp.first_name} ${emp.last_name} ${type === 'CHECK_IN' ? 'checked in' : 'checked out'} at ${timeStr}`);
      } else {
        setScanState('ERROR');
        toast.error('Failed to save transaction');
      }

      setSelectedEmployee('');
      setManualId('');
      setSearchTerm('');

      setTimeout(() => setScanState('READY'), 3000);
    }, 1500);
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#618FF5' }} />
      </div>
    );
  }

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
                        disabled={scanState === 'SCANNING'}
                      />
                    </div>
                    {searchTerm && filteredEmployees.length > 0 && (
                      <div style={{ border: '1px solid #e4e4e4', maxHeight: '200px', overflowY: 'auto', marginTop: '4px', borderRadius: '6px' }}>
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
                    {searchTerm && filteredEmployees.length === 0 && (
                      <p style={{ fontSize: '13px', color: '#a3a3a3', padding: '8px 0' }}>No employees found</p>
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
                      disabled={scanState === 'SCANNING'}
                    />
                    <button className="btn-primary" onClick={() => handleScan()} disabled={scanState === 'SCANNING'}>Scan</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Scans + Stats */}
        <div>
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Today&apos;s Transactions</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '400px', overflowY: 'auto' }}>
              {todayTransactions.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#a3a3a3', textAlign: 'center', padding: '16px' }}>No scans yet today</p>
              ) : (
                todayTransactions.slice(0, 15).map((txn, i) => (
                  <div key={txn.transaction_id} className="flex items-center gap-3 py-2" style={{ borderBottom: i < Math.min(todayTransactions.length, 15) - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: txn.transaction_type === 'CHECK_IN' ? '#D1FAE5' : '#DBEAFE' }}
                    >
                      {txn.transaction_type === 'CHECK_IN' ? (
                        <LogIn size={14} style={{ color: '#065F46' }} />
                      ) : (
                        <LogOut size={14} style={{ color: '#1D4ED8' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 500 }}>{txn.employee_name || getEmployeeName(txn.employee_id)}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                        {txn.transaction_type === 'CHECK_IN' ? 'Checked In' : 'Checked Out'} at {txn.transaction_time.slice(0, 5)}
                      </p>
                    </div>
                    <span className="tibbna-badge" style={{
                      backgroundColor: txn.transaction_type === 'CHECK_IN' ? '#D1FAE5' : '#DBEAFE',
                      color: txn.transaction_type === 'CHECK_IN' ? '#065F46' : '#1D4ED8',
                      fontSize: '10px',
                    }}>
                      {txn.transaction_type === 'CHECK_IN' ? 'IN' : 'OUT'}
                    </span>
                  </div>
                ))
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
                <span style={{ fontWeight: 600, color: '#10B981' }}>{todayCheckIns}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Total Check-outs</span>
                <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{todayCheckOuts}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Currently In</span>
                <span style={{ fontWeight: 600, color: '#F59E0B' }}>{todayCheckIns - todayCheckOuts}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
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
