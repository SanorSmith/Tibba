'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, Filter, Trash2, Download, RefreshCw } from 'lucide-react';
import type { AttendanceException, AttendanceTransaction, Employee } from '@/types/hr';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const severityColors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: '#DBEAFE', text: '#1D4ED8' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
  HIGH: { bg: '#FEE2E2', text: '#991B1B' },
};

const typeLabels: Record<string, string> = {
  LATE_ARRIVAL: 'Late Arrival',
  EARLY_DEPARTURE: 'Early Departure',
  MISSING_CHECKOUT: 'Missing Checkout',
  ABNORMAL_HOURS: 'Abnormal Hours',
  UNAUTHORIZED_ABSENCE: 'Unauthorized Absence',
};

// Work time thresholds
const WORK_START = '08:30:00';
const WORK_END   = '16:30:00';
const LATE_THRESHOLD_MIN = 15;

export default function AttendanceExceptionsPage() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole(['HR_ADMIN', 'Administrator']);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [justification, setJustification] = useState('');

  // =========================================================================
  // LOAD DATA
  // =========================================================================

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    try {
      const emps = dataStore.getEmployees();
      let excs = dataStore.getAttendanceExceptions();

      // Auto-detect from transactions if no exceptions stored yet
      if (excs.length === 0) {
        const txns = dataStore.getAttendanceTransactions();
        excs = autoDetectExceptions(emps, txns);
      }

      setEmployees(emps);
      setExceptions(excs);
    } catch (error) {
      console.error('Error loading exceptions:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // AUTO-DETECT EXCEPTIONS FROM TRANSACTIONS
  // =========================================================================

  const autoDetectExceptions = (emps: Employee[], txns: AttendanceTransaction[]): AttendanceException[] => {
    const detected: AttendanceException[] = [];
    const today = new Date().toISOString().split('T')[0];
    const activeEmps = emps.filter(e => (e as any).employment_status === 'ACTIVE');

    // Get unique dates from transactions
    const dates = [...new Set(txns.map(t => t.transaction_date))];

    activeEmps.forEach(emp => {
      dates.forEach(date => {
        const dayTxns = txns
          .filter(t => t.employee_id === emp.id && t.transaction_date === date)
          .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));

        const checkIns = dayTxns.filter(t => t.transaction_type === 'CHECK_IN');
        const checkOuts = dayTxns.filter(t => t.transaction_type === 'CHECK_OUT');
        const empName = `${emp.first_name} ${emp.last_name}`;
        const dept = (emp as any).department_name || '';

        // Late arrival
        if (checkIns.length > 0) {
          const firstIn = checkIns[0].transaction_time;
          if (firstIn > WORK_START) {
            const [h, m] = firstIn.split(':').map(Number);
            const [eh, em] = WORK_START.split(':').map(Number);
            const lateMins = (h * 60 + m) - (eh * 60 + em);
            if (lateMins >= LATE_THRESHOLD_MIN) {
              const severity = lateMins >= 60 ? 'HIGH' : lateMins >= 30 ? 'MEDIUM' : 'LOW';
              detected.push({
                exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                employee_id: emp.id,
                employee_name: empName,
                department: dept,
                exception_date: date,
                exception_type: 'LATE_ARRIVAL',
                details: `Arrived ${lateMins} minutes late. Scheduled: ${WORK_START.slice(0, 5)}, Actual: ${firstIn.slice(0, 5)}`,
                severity: severity as 'LOW' | 'MEDIUM' | 'HIGH',
                review_status: 'PENDING',
              });
            }
          }
        }

        // Early departure
        if (checkOuts.length > 0) {
          const lastOut = checkOuts[checkOuts.length - 1].transaction_time;
          if (lastOut < WORK_END) {
            const [h, m] = lastOut.split(':').map(Number);
            const [eh, em] = WORK_END.split(':').map(Number);
            const earlyMins = (eh * 60 + em) - (h * 60 + m);
            if (earlyMins >= LATE_THRESHOLD_MIN) {
              const severity = earlyMins >= 60 ? 'HIGH' : earlyMins >= 30 ? 'MEDIUM' : 'LOW';
              detected.push({
                exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                employee_id: emp.id,
                employee_name: empName,
                department: dept,
                exception_date: date,
                exception_type: 'EARLY_DEPARTURE',
                details: `Left ${earlyMins} minutes early. Scheduled end: ${WORK_END.slice(0, 5)}, Actual: ${lastOut.slice(0, 5)}`,
                severity: severity as 'LOW' | 'MEDIUM' | 'HIGH',
                review_status: 'PENDING',
              });
            }
          }
        }

        // Missing check-out (checked in but no check-out, not today)
        if (checkIns.length > 0 && checkOuts.length === 0 && date !== today) {
          detected.push({
            exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            employee_id: emp.id,
            employee_name: empName,
            department: dept,
            exception_date: date,
            exception_type: 'MISSING_CHECKOUT',
            details: `Checked in at ${checkIns[0].transaction_time.slice(0, 5)} but no check-out recorded`,
            severity: 'HIGH',
            review_status: 'PENDING',
          });
        }
      });
    });

    // Persist detected exceptions
    detected.forEach(exc => dataStore.addAttendanceException(exc));
    return detected;
  };

  // =========================================================================
  // RE-SCAN: detect new exceptions from recent transactions
  // =========================================================================

  const handleRescan = () => {
    const emps = dataStore.getEmployees();
    const txns = dataStore.getAttendanceTransactions();
    const existingDates = new Set(exceptions.map(e => `${e.employee_id}|${e.exception_date}|${e.exception_type}`));
    const activeEmps = emps.filter(e => (e as any).employment_status === 'ACTIVE');
    const today = new Date().toISOString().split('T')[0];
    const dates = [...new Set(txns.map(t => t.transaction_date))];
    let newCount = 0;

    activeEmps.forEach(emp => {
      dates.forEach(date => {
        const dayTxns = txns
          .filter(t => t.employee_id === emp.id && t.transaction_date === date)
          .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));
        const checkIns = dayTxns.filter(t => t.transaction_type === 'CHECK_IN');
        const checkOuts = dayTxns.filter(t => t.transaction_type === 'CHECK_OUT');
        const empName = `${emp.first_name} ${emp.last_name}`;
        const dept = (emp as any).department_name || '';

        if (checkIns.length > 0) {
          const firstIn = checkIns[0].transaction_time;
          if (firstIn > WORK_START) {
            const [h, m] = firstIn.split(':').map(Number);
            const [eh, em] = WORK_START.split(':').map(Number);
            const lateMins = (h * 60 + m) - (eh * 60 + em);
            if (lateMins >= LATE_THRESHOLD_MIN) {
              const key = `${emp.id}|${date}|LATE_ARRIVAL`;
              if (!existingDates.has(key)) {
                const severity = lateMins >= 60 ? 'HIGH' : lateMins >= 30 ? 'MEDIUM' : 'LOW';
                const exc: AttendanceException = {
                  exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  employee_id: emp.id, employee_name: empName, department: dept,
                  exception_date: date, exception_type: 'LATE_ARRIVAL',
                  details: `Arrived ${lateMins} min late. Scheduled: ${WORK_START.slice(0, 5)}, Actual: ${firstIn.slice(0, 5)}`,
                  severity: severity as any, review_status: 'PENDING',
                };
                dataStore.addAttendanceException(exc);
                newCount++;
              }
            }
          }
        }

        if (checkOuts.length > 0) {
          const lastOut = checkOuts[checkOuts.length - 1].transaction_time;
          if (lastOut < WORK_END) {
            const [h, m] = lastOut.split(':').map(Number);
            const [eh, em] = WORK_END.split(':').map(Number);
            const earlyMins = (eh * 60 + em) - (h * 60 + m);
            if (earlyMins >= LATE_THRESHOLD_MIN) {
              const key = `${emp.id}|${date}|EARLY_DEPARTURE`;
              if (!existingDates.has(key)) {
                const severity = earlyMins >= 60 ? 'HIGH' : earlyMins >= 30 ? 'MEDIUM' : 'LOW';
                const exc: AttendanceException = {
                  exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  employee_id: emp.id, employee_name: empName, department: dept,
                  exception_date: date, exception_type: 'EARLY_DEPARTURE',
                  details: `Left ${earlyMins} min early. End: ${WORK_END.slice(0, 5)}, Actual: ${lastOut.slice(0, 5)}`,
                  severity: severity as any, review_status: 'PENDING',
                };
                dataStore.addAttendanceException(exc);
                newCount++;
              }
            }
          }
        }

        if (checkIns.length > 0 && checkOuts.length === 0 && date !== today) {
          const key = `${emp.id}|${date}|MISSING_CHECKOUT`;
          if (!existingDates.has(key)) {
            const exc: AttendanceException = {
              exception_id: `EXC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              employee_id: emp.id, employee_name: empName, department: dept,
              exception_date: date, exception_type: 'MISSING_CHECKOUT',
              details: `Checked in at ${checkIns[0].transaction_time.slice(0, 5)} but no check-out recorded`,
              severity: 'HIGH', review_status: 'PENDING',
            };
            dataStore.addAttendanceException(exc);
            newCount++;
          }
        }
      });
    });

    if (newCount > 0) {
      toast.success(`Detected ${newCount} new exception(s)`);
    } else {
      toast.info('No new exceptions found');
    }
    setExceptions(dataStore.getAttendanceExceptions());
  };

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleAction = (exceptionId: string, action: 'JUSTIFIED' | 'WARNING_ISSUED' | 'DISMISSED') => {
    const updates: Partial<AttendanceException> = {
      review_status: action,
      reviewed_by: user?.name || 'HR Department',
      review_date: new Date().toISOString().split('T')[0],
    };
    if (action === 'JUSTIFIED' && justification.trim()) {
      updates.justification = justification.trim();
    }

    const success = dataStore.updateAttendanceException(exceptionId, updates);
    if (success) {
      toast.success(`Exception ${action === 'JUSTIFIED' ? 'justified' : action === 'WARNING_ISSUED' ? 'warning issued' : 'dismissed'}`);
      setExceptions(dataStore.getAttendanceExceptions());
    } else {
      toast.error('Failed to update exception');
    }
    setActionModal(null);
    setJustification('');
  };

  const handleDelete = (exceptionId: string) => {
    if (!confirm('Delete this exception?')) return;
    const success = dataStore.deleteAttendanceException(exceptionId);
    if (success) {
      toast.success('Exception deleted');
      setExceptions(dataStore.getAttendanceExceptions());
    } else {
      toast.error('Failed to delete');
    }
  };

  // =========================================================================
  // CSV EXPORT
  // =========================================================================

  const handleExport = () => {
    const headers = ['Exception ID', 'Employee', 'Department', 'Date', 'Type', 'Details', 'Severity', 'Status', 'Justification', 'Reviewed By'];
    const rows = filtered.map(e => [
      e.exception_id, e.employee_name, e.department || '', e.exception_date,
      typeLabels[e.exception_type] || e.exception_type, `"${e.details}"`,
      e.severity, e.review_status, e.justification || '', e.reviewed_by || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `exceptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // =========================================================================
  // FILTERING
  // =========================================================================

  const filtered = useMemo(() => {
    return exceptions.filter(e => {
      if (statusFilter !== 'all' && e.review_status !== statusFilter) return false;
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && e.exception_type !== typeFilter) return false;
      return true;
    }).sort((a, b) => b.exception_date.localeCompare(a.exception_date));
  }, [exceptions, statusFilter, severityFilter, typeFilter]);

  const pendingCount = exceptions.filter(e => e.review_status === 'PENDING').length;
  const justifiedCount = exceptions.filter(e => e.review_status === 'JUSTIFIED').length;
  const warningCount = exceptions.filter(e => e.review_status === 'WARNING_ISSUED').length;
  const dismissedCount = exceptions.filter(e => e.review_status === 'DISMISSED').length;

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
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/attendance">
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div className="flex-1">
            <h2 className="page-title">Attendance Exceptions</h2>
            <p className="page-description">{exceptions.length} exceptions found</p>
          </div>
          <button className="btn-secondary flex items-center gap-2" onClick={handleRescan}>
            <RefreshCw size={14} /> Re-scan
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Exceptions</p><p className="tibbna-card-value">{exceptions.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><AlertTriangle size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Pending Review</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{pendingCount}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Clock size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Justified</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{justifiedCount}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Warnings Issued</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{warningCount}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><XCircle size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 tibbna-section">
        <select className="tibbna-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="JUSTIFIED">Justified</option>
          <option value="WARNING_ISSUED">Warning Issued</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <select className="tibbna-input" style={{ width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="all">All Severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select className="tibbna-input" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="LATE_ARRIVAL">Late Arrival</option>
          <option value="EARLY_DEPARTURE">Early Departure</option>
          <option value="MISSING_CHECKOUT">Missing Checkout</option>
          <option value="UNAUTHORIZED_ABSENCE">Unauthorized Absence</option>
        </select>
      </div>

      {/* Exception Cards */}
      <div className="space-y-3">
        {filtered.map(exc => {
          const sevColor = severityColors[exc.severity] || severityColors.LOW;
          return (
            <div key={exc.exception_id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <EmployeeAvatar name={exc.employee_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>{exc.employee_name}</span>
                        <span className="tibbna-badge" style={{ backgroundColor: sevColor.bg, color: sevColor.text, fontSize: '10px' }}>{exc.severity}</span>
                        <SmartStatusBadge status={exc.review_status} />
                      </div>
                      <p style={{ fontSize: '13px', color: '#525252' }}>
                        <strong>{typeLabels[exc.exception_type] || exc.exception_type}</strong> | {exc.department} | {exc.exception_date}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{exc.details}</p>
                      {exc.justification && (
                        <p style={{ fontSize: '12px', color: '#065F46', marginTop: '4px', padding: '4px 8px', backgroundColor: '#D1FAE5', borderRadius: '4px' }}>
                          Justification: {exc.justification}
                        </p>
                      )}
                      {exc.reviewed_by && (
                        <p style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px' }}>
                          Reviewed by {exc.reviewed_by} on {exc.review_date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {exc.review_status === 'PENDING' && (
                      <>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => setActionModal(exc.exception_id)}>
                          Justify
                        </button>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px', color: '#EF4444' }} onClick={() => handleAction(exc.exception_id, 'WARNING_ISSUED')}>
                          Warn
                        </button>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px', color: '#6B7280' }} onClick={() => handleAction(exc.exception_id, 'DISMISSED')}>
                          Dismiss
                        </button>
                      </>
                    )}
                    {isManager && (
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 8px', color: '#EF4444' }} onClick={() => handleDelete(exc.exception_id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="tibbna-card">
            <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>
              <AlertTriangle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: '13px' }}>No exceptions match the current filters</p>
              {(statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  onClick={() => { setStatusFilter('all'); setSeverityFilter('all'); setTypeFilter('all'); }}
                  style={{ fontSize: '12px', color: '#618FF5', marginTop: '8px', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Justification Modal */}
      {actionModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setActionModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg" style={{ border: '1px solid #e4e4e4' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e4e4e4' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Add Justification</h3>
                {(() => {
                  const exc = exceptions.find(e => e.exception_id === actionModal);
                  return exc ? (
                    <p style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}>
                      {exc.employee_name} — {typeLabels[exc.exception_type]} — {exc.exception_date}
                    </p>
                  ) : null;
                })()}
              </div>
              <div style={{ padding: '16px' }}>
                <textarea
                  className="tibbna-input"
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                  placeholder="Enter justification reason..."
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                />
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid #e4e4e4', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => { setActionModal(null); setJustification(''); }}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction(actionModal, 'JUSTIFIED')} disabled={!justification.trim()}>
                  Submit Justification
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
