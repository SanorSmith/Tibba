'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import type { AttendanceException } from '@/types/hr';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import employeesData from '@/data/hr/employees.json';

const demoExceptions: AttendanceException[] = [
  { exception_id: 'EXC-001', employee_id: 'EMP-2024-010', employee_name: 'Hassan Al-Dulaimi', department: 'Nursing', exception_date: '2026-02-08', exception_type: 'LATE_ARRIVAL', details: 'Arrived 25 minutes late. Scheduled: 07:00, Actual: 07:25', severity: 'MEDIUM', review_status: 'PENDING' },
  { exception_id: 'EXC-002', employee_id: 'EMP-2024-015', employee_name: 'Layla Al-Obeidi', department: 'Pharmacy', exception_date: '2026-02-08', exception_type: 'MISSING_CHECKOUT', details: 'No check-out recorded for shift ending at 15:00', severity: 'HIGH', review_status: 'PENDING' },
  { exception_id: 'EXC-003', employee_id: 'EMP-2024-022', employee_name: 'Karim Al-Azzawi', department: 'Laboratory', exception_date: '2026-02-07', exception_type: 'ABNORMAL_HOURS', details: 'Recorded 22 hours in a single day. Possible missed check-out from previous day', severity: 'HIGH', review_status: 'PENDING' },
  { exception_id: 'EXC-004', employee_id: 'EMP-2024-008', employee_name: 'Sara Mohammed', department: 'Internal Medicine', exception_date: '2026-02-07', exception_type: 'EARLY_DEPARTURE', details: 'Left at 13:30, scheduled end: 15:00. 1.5 hours early', severity: 'LOW', review_status: 'JUSTIFIED', justification: 'Medical appointment - approved by department head', reviewed_by: 'Dr. Ali Al-Tamimi', review_date: '2026-02-07' },
  { exception_id: 'EXC-005', employee_id: 'EMP-2024-030', employee_name: 'Youssef Al-Hamdani', department: 'Maintenance', exception_date: '2026-02-06', exception_type: 'UNAUTHORIZED_ABSENCE', details: 'No attendance record for the entire day. No leave request submitted', severity: 'HIGH', review_status: 'WARNING_ISSUED', reviewed_by: 'HR Department', review_date: '2026-02-07' },
  { exception_id: 'EXC-006', employee_id: 'EMP-2024-012', employee_name: 'Mariam Al-Shammari', department: 'Pediatrics', exception_date: '2026-02-06', exception_type: 'LATE_ARRIVAL', details: 'Arrived 12 minutes late. Scheduled: 08:00, Actual: 08:12', severity: 'LOW', review_status: 'DISMISSED', reviewed_by: 'HR Department', review_date: '2026-02-06' },
  { exception_id: 'EXC-007', employee_id: 'EMP-2024-018', employee_name: 'Tariq Al-Jubouri', department: 'Radiology', exception_date: '2026-02-05', exception_type: 'LATE_ARRIVAL', details: 'Arrived 45 minutes late. Scheduled: 07:00, Actual: 07:45', severity: 'HIGH', review_status: 'WARNING_ISSUED', reviewed_by: 'HR Department', review_date: '2026-02-06' },
  { exception_id: 'EXC-008', employee_id: 'EMP-2024-025', employee_name: 'Dina Al-Kubaisi', department: 'Finance', exception_date: '2026-02-05', exception_type: 'MISSING_CHECKOUT', details: 'No check-out recorded for shift ending at 16:00', severity: 'MEDIUM', review_status: 'JUSTIFIED', justification: 'System error - badge reader malfunction confirmed by IT', reviewed_by: 'IT Support', review_date: '2026-02-05' },
];

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

export default function AttendanceExceptionsPage() {
  const [exceptions, setExceptions] = useState(demoExceptions);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [justification, setJustification] = useState('');

  const filtered = exceptions.filter(e => {
    if (statusFilter !== 'all' && e.review_status !== statusFilter) return false;
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    return true;
  });

  const pendingCount = exceptions.filter(e => e.review_status === 'PENDING').length;
  const justifiedCount = exceptions.filter(e => e.review_status === 'JUSTIFIED').length;
  const warningCount = exceptions.filter(e => e.review_status === 'WARNING_ISSUED').length;

  const handleAction = (exceptionId: string, action: 'JUSTIFIED' | 'WARNING_ISSUED' | 'DISMISSED') => {
    setExceptions(prev => prev.map(e =>
      e.exception_id === exceptionId
        ? { ...e, review_status: action, reviewed_by: 'HR Department', review_date: new Date().toISOString().split('T')[0], justification: action === 'JUSTIFIED' ? justification : undefined }
        : e
    ));
    setActionModal(null);
    setJustification('');
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/attendance">
            <button className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <h2 className="page-title">Attendance Exceptions</h2>
            <p className="page-description">{exceptions.length} exceptions found</p>
          </div>
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
                        <p style={{ fontSize: '12px', color: '#065F46', marginTop: '4px', padding: '4px 8px', backgroundColor: '#D1FAE5' }}>
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

                  {exc.review_status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => setActionModal(exc.exception_id)}>
                        Justify
                      </button>
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px', color: '#EF4444' }} onClick={() => handleAction(exc.exception_id, 'WARNING_ISSUED')}>
                        Warn
                      </button>
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px', color: '#6B7280' }} onClick={() => handleAction(exc.exception_id, 'DISMISSED')}>
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="tibbna-card">
            <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>
              No exceptions match the current filters
            </div>
          </div>
        )}
      </div>

      {/* Justification Modal */}
      {actionModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setActionModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md" style={{ border: '1px solid #e4e4e4' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e4e4e4' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Add Justification</h3>
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
