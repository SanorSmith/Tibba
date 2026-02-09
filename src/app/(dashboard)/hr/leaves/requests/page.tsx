'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Search, Eye, X, CheckCircle, XCircle, Download,
  Calendar, Clock, FileText, Users, Filter, RotateCcw
} from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeaveRequest, Employee } from '@/types/hr';

// Balance key lookup by leave type name
const BALANCE_KEY_MAP: Record<string, string> = {
  'Annual Leave': 'annual',
  'Sick Leave': 'sick',
  'Emergency Leave': 'emergency',
  'Maternity Leave': 'maternity',
  'Paternity Leave': 'paternity',
  'Unpaid Leave': 'unpaid',
  'Hajj Leave': 'hajj',
  'Study Leave': 'study',
};

export default function LeaveRequestsListPage() {
  const { user, hasRole } = useAuth();

  // =========================================================================
  // STATE
  // =========================================================================
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // View mode
  const [viewMode, setViewMode] = useState<'my-requests' | 'all-requests'>(
    'all-requests'
  );

  // Detail modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      const emps = dataStore.getEmployees();
      const reqs = dataStore.getLeaveRequests();
      setEmployees(emps);
      setAllRequests(reqs);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DERIVED DATA
  // =========================================================================
  const leaveTypes = useMemo(() => [...new Set(allRequests.map(r => r.leave_type))].sort(), [allRequests]);

  const getEmp = useCallback((id: string) => employees.find(e => e.id === id), [employees]);

  const empName = useCallback((id: string) => {
    const e = getEmp(id);
    return e ? `${e.first_name} ${e.last_name}` : id;
  }, [getEmp]);

  const empDept = useCallback((id: string) => getEmp(id)?.department_name || '-', [getEmp]);

  const empInitials = useCallback((id: string) => {
    const e = getEmp(id);
    if (!e) return '??';
    return `${e.first_name?.[0] || ''}${e.last_name?.[0] || ''}`.toUpperCase();
  }, [getEmp]);

  // =========================================================================
  // FILTERING
  // =========================================================================
  const filteredRequests = useMemo(() => {
    let filtered = allRequests;

    // View mode — "my-requests" matches by user name since User has no employeeId
    if (viewMode === 'my-requests' && user) {
      filtered = filtered.filter(r => {
        const name = r.employee_name?.toLowerCase() || empName(r.employee_id).toLowerCase();
        return name.includes(user.name.toLowerCase());
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const name = r.employee_name?.toLowerCase() || empName(r.employee_id).toLowerCase();
        const reqNum = (r.request_number || r.id).toLowerCase();
        return name.includes(q) || reqNum.includes(q);
      });
    }

    // Status
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);

    // Type
    if (typeFilter !== 'all') filtered = filtered.filter(r => r.leave_type === typeFilter);

    // Date range
    const today = new Date().toISOString().split('T')[0];
    if (dateRangeFilter === 'upcoming') filtered = filtered.filter(r => r.start_date > today);
    else if (dateRangeFilter === 'past') filtered = filtered.filter(r => r.end_date < today);
    else if (dateRangeFilter === 'current') filtered = filtered.filter(r => r.start_date <= today && r.end_date >= today);

    // Sort newest first
    return filtered.sort((a, b) =>
      new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime()
    );
  }, [allRequests, viewMode, user, searchQuery, statusFilter, typeFilter, dateRangeFilter, empName]);

  // =========================================================================
  // STATS
  // =========================================================================
  const stats = useMemo(() => {
    const src = viewMode === 'my-requests' && user
      ? allRequests.filter(r => (r.employee_name || empName(r.employee_id)).toLowerCase().includes(user.name.toLowerCase()))
      : allRequests;
    return {
      total: src.length,
      pending: src.filter(r => r.status === 'PENDING_APPROVAL').length,
      approved: src.filter(r => r.status === 'APPROVED').length,
      rejected: src.filter(r => r.status === 'REJECTED').length,
      cancelled: src.filter(r => r.status === 'CANCELLED').length,
    };
  }, [allRequests, viewMode, user, empName]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateRangeFilter !== 'all';

  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setDateRangeFilter('all'); };

  // =========================================================================
  // ACTIONS
  // =========================================================================
  const handleCancel = (requestId: string) => {
    const req = allRequests.find(r => r.id === requestId);
    if (!req) return;
    if (req.status !== 'PENDING_APPROVAL') { toast.error('Only pending requests can be cancelled'); return; }
    if (!confirm('Cancel this leave request? The balance will be restored.')) return;

    setProcessingId(requestId);
    try {
      const ok = dataStore.updateLeaveRequest(requestId, { status: 'CANCELLED' as any });
      if (!ok) { toast.error('Failed to cancel'); return; }

      // Restore balance
      const balKey = BALANCE_KEY_MAP[req.leave_type];
      if (balKey) {
        const rawBal = dataStore.getRawLeaveBalance(req.employee_id);
        if (rawBal?.[balKey]) {
          dataStore.updateLeaveBalanceByType(req.employee_id, balKey, {
            pending: Math.max(0, (rawBal[balKey].pending || 0) - req.total_days),
            available: (rawBal[balKey].available || 0) + req.total_days,
          });
        }
      }
      toast.success('Leave request cancelled — balance restored');
      loadData();
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error('Error cancelling request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (requestId: string) => {
    const req = allRequests.find(r => r.id === requestId);
    if (!req || req.status !== 'PENDING_APPROVAL') return;

    setProcessingId(requestId);
    try {
      // Determine which approver step to advance
      const updates: Partial<LeaveRequest> = {};
      if (req.approver_1_status !== 'APPROVED') {
        updates.approver_1_status = 'APPROVED';
        // If only 2 approvers needed and approver_2 already approved, or single-level
        if (req.approver_2_status === 'APPROVED') {
          updates.status = 'APPROVED' as any;
          updates.approved_at = new Date().toISOString().split('T')[0];
        }
      } else if (req.approver_2_status !== 'APPROVED') {
        updates.approver_2_status = 'APPROVED';
        updates.status = 'APPROVED' as any;
        updates.approved_at = new Date().toISOString().split('T')[0];
      }

      const ok = dataStore.updateLeaveRequest(requestId, updates);
      if (!ok) { toast.error('Failed to approve'); return; }

      // If fully approved, move balance from pending to taken
      if (updates.status === 'APPROVED') {
        const balKey = BALANCE_KEY_MAP[req.leave_type];
        if (balKey) {
          const rawBal = dataStore.getRawLeaveBalance(req.employee_id);
          if (rawBal?.[balKey]) {
            dataStore.updateLeaveBalanceByType(req.employee_id, balKey, {
              pending: Math.max(0, (rawBal[balKey].pending || 0) - req.total_days),
              used: (rawBal[balKey].used || rawBal[balKey].taken || 0) + req.total_days,
            });
          }
        }
        toast.success('Leave request fully approved');
      } else {
        toast.success('Approval step recorded');
      }
      loadData();
      if (selectedRequest?.id === requestId) setSelectedRequest(null);
    } catch (err) {
      console.error('Approve error:', err);
      toast.error('Error approving request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (requestId: string) => {
    const reason = prompt('Rejection reason (optional):');
    const req = allRequests.find(r => r.id === requestId);
    if (!req || req.status !== 'PENDING_APPROVAL') return;

    setProcessingId(requestId);
    try {
      const ok = dataStore.updateLeaveRequest(requestId, {
        status: 'REJECTED' as any,
        rejection_reason: reason || undefined,
      });
      if (!ok) { toast.error('Failed to reject'); return; }

      // Restore balance
      const balKey = BALANCE_KEY_MAP[req.leave_type];
      if (balKey) {
        const rawBal = dataStore.getRawLeaveBalance(req.employee_id);
        if (rawBal?.[balKey]) {
          dataStore.updateLeaveBalanceByType(req.employee_id, balKey, {
            pending: Math.max(0, (rawBal[balKey].pending || 0) - req.total_days),
            available: (rawBal[balKey].available || 0) + req.total_days,
          });
        }
      }
      toast.success('Leave request rejected — balance restored');
      loadData();
      if (selectedRequest?.id === requestId) setSelectedRequest(null);
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('Error rejecting request');
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================================================
  // CSV EXPORT
  // =========================================================================
  const exportCSV = () => {
    const header = 'Request #,Employee,Department,Leave Type,Start,End,Days,Status,Submitted\n';
    const rows = filteredRequests.map(r =>
      `"${r.request_number || r.id}","${r.employee_name || empName(r.employee_id)}","${r.department || empDept(r.employee_id)}","${r.leave_type}","${r.start_date}","${r.end_date}",${r.total_days},"${r.status}","${r.submitted_at || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRequests.length} requests to CSV`);
  };

  // =========================================================================
  // HELPERS
  // =========================================================================
  const fmtDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const approvalProgress = (r: LeaveRequest) => {
    let approved = 0;
    const total = r.total_days > 14 ? 3 : 2;
    if (r.approver_1_status === 'APPROVED') approved++;
    if (r.approver_2_status === 'APPROVED') approved++;
    return { approved, total };
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading leave requests…</p>
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
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Requests</h2>
            <p className="page-description">
              {filteredRequests.length} of {allRequests.length} requests
              {viewMode === 'my-requests' ? ' (My Requests)' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={exportCSV} disabled={filteredRequests.length === 0}>
            <Download size={14} /> CSV
          </button>
          <Link href="/hr/leaves/requests/new">
            <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Request</button>
          </Link>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW MODE TOGGLE                                                  */}
      {/* ================================================================= */}
      {hasRole(['HR_ADMIN', 'Administrator', 'Doctor']) && (
        <div className="tibbna-section flex gap-2">
          {(['all-requests', 'my-requests'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={viewMode === mode ? 'tibbna-tab tibbna-tab-active' : 'tibbna-tab'}
            >
              {mode === 'all-requests' ? 'All Requests' : 'My Requests'}
            </button>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* KPI CARDS                                                         */}
      {/* ================================================================= */}
      <div className="tibbna-grid-4 tibbna-section" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[
          { label: 'Total', value: stats.total, color: '#111827' },
          { label: 'Pending', value: stats.pending, color: '#F59E0B' },
          { label: 'Approved', value: stats.approved, color: '#10B981' },
          { label: 'Rejected', value: stats.rejected, color: '#EF4444' },
          { label: 'Cancelled', value: stats.cancelled, color: '#6B7280' },
        ].map(k => (
          <div key={k.label} className="tibbna-card">
            <div className="tibbna-card-content">
              <p className="tibbna-card-title">{k.label}</p>
              <p className="tibbna-card-value" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ================================================================= */}
      {/* FILTERS                                                           */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
              <input className="tibbna-input" style={{ paddingLeft: '32px' }} placeholder="Name or request #…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {/* Status */}
            <select className="tibbna-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            {/* Type */}
            <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Leave Types</option>
              {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Date range */}
            <select className="tibbna-input" value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="current">Current</option>
              <option value="past">Past</option>
            </select>
            {/* Clear */}
            {hasActiveFilters && (
              <button className="btn-secondary flex items-center gap-1 justify-center" onClick={clearFilters}>
                <RotateCcw size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TABLE (Desktop)                                                   */}
      {/* ================================================================= */}
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '560px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3' }}>
                      <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <p style={{ fontSize: '13px' }}>No leave requests found</p>
                      {hasActiveFilters && (
                        <button className="btn-secondary mt-3" style={{ fontSize: '11px' }} onClick={clearFilters}>Clear Filters</button>
                      )}
                    </td>
                  </tr>
                ) : filteredRequests.map(r => {
                  const prog = approvalProgress(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#618FF5' }}>{r.request_number || r.id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#618FF5', flexShrink: 0 }}>
                            {empInitials(r.employee_id)}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>{r.employee_name || empName(r.employee_id)}</p>
                            <p style={{ fontSize: '10px', color: '#a3a3a3' }}>{r.department || empDept(r.employee_id)}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>{r.leave_type}</td>
                      <td style={{ fontSize: '11px' }}>
                        {fmtDate(r.start_date)}<br />
                        <span style={{ color: '#a3a3a3' }}>→ {fmtDate(r.end_date)}</span>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>
                        {r.total_days}{r.is_half_day ? ' (½)' : ''}
                      </td>
                      <td><SmartStatusBadge status={r.status} /></td>
                      <td>
                        {r.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center gap-1">
                            <div style={{ width: '40px', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(prog.approved / prog.total) * 100}%`, backgroundColor: '#10B981', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '10px', color: '#6B7280' }}>{prog.approved}/{prog.total}</span>
                          </div>
                        ) : r.status === 'APPROVED' ? (
                          <span style={{ fontSize: '10px', color: '#10B981' }}>✓ Complete</span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#a3a3a3' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '11px', color: '#6B7280' }}>{fmtDate(r.submitted_at || '')}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn-secondary p-1" title="View Details" onClick={() => setSelectedRequest(r)}>
                            <Eye size={14} />
                          </button>
                          {r.status === 'PENDING_APPROVAL' && hasRole(['HR_ADMIN', 'Administrator', 'Doctor']) && (
                            <>
                              <button
                                className="p-1" style={{ color: '#10B981' }} title="Approve"
                                onClick={() => handleApprove(r.id)}
                                disabled={processingId === r.id}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="p-1" style={{ color: '#EF4444' }} title="Reject"
                                onClick={() => handleReject(r.id)}
                                disabled={processingId === r.id}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {r.status === 'PENDING_APPROVAL' && (
                            <button
                              className="p-1" style={{ color: '#9CA3AF' }} title="Cancel"
                              onClick={() => handleCancel(r.id)}
                              disabled={processingId === r.id}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ============================================================= */}
          {/* MOBILE CARDS                                                   */}
          {/* ============================================================= */}
          <div className="md:hidden space-y-2">
            {filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>
                <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: '13px' }}>No leave requests found</p>
              </div>
            ) : filteredRequests.map(r => {
              const prog = approvalProgress(r);
              return (
                <div key={r.id} style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '8px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#618FF5' }}>
                        {empInitials(r.employee_id)}
                      </div>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{r.employee_name || empName(r.employee_id)}</p>
                        <p style={{ fontSize: '10px', color: '#a3a3a3' }}>{r.leave_type} • {r.request_number || r.id}</p>
                      </div>
                    </div>
                    <SmartStatusBadge status={r.status} />
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '12px', color: '#525252', marginBottom: '4px' }}>
                    <span>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</span>
                    <span style={{ fontWeight: 600 }}>{r.total_days} day(s)</span>
                  </div>

                  {r.status === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{ flex: 1, height: '3px', backgroundColor: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(prog.approved / prog.total) * 100}%`, backgroundColor: '#10B981', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#6B7280' }}>{prog.approved}/{prog.total} approved</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <button className="btn-secondary flex-1 flex items-center justify-center gap-1" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => setSelectedRequest(r)}>
                      <Eye size={12} /> Details
                    </button>
                    {r.status === 'PENDING_APPROVAL' && hasRole(['HR_ADMIN', 'Administrator', 'Doctor']) && (
                      <>
                        <button style={{ fontSize: '11px', padding: '4px 8px', color: '#10B981', fontWeight: 600 }} onClick={() => handleApprove(r.id)} disabled={processingId === r.id}>Approve</button>
                        <button style={{ fontSize: '11px', padding: '4px 8px', color: '#EF4444', fontWeight: 600 }} onClick={() => handleReject(r.id)} disabled={processingId === r.id}>Reject</button>
                      </>
                    )}
                    {r.status === 'PENDING_APPROVAL' && (
                      <button style={{ fontSize: '11px', padding: '4px 8px', color: '#9CA3AF' }} onClick={() => handleCancel(r.id)} disabled={processingId === r.id}>Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result count */}
          {filteredRequests.length > 0 && (
            <p style={{ fontSize: '11px', color: '#a3a3a3', textAlign: 'center', marginTop: '12px' }}>
              Showing {filteredRequests.length} of {allRequests.length} requests
            </p>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* DETAIL MODAL                                                      */}
      {/* ================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e4e4e4', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Leave Request Details</h3>
                <p style={{ fontSize: '11px', color: '#a3a3a3', fontFamily: 'monospace' }}>{selectedRequest.request_number || selectedRequest.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <SmartStatusBadge status={selectedRequest.status} />
                <button onClick={() => setSelectedRequest(null)} style={{ color: '#a3a3a3' }}><X size={18} /></button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-5">
              {/* Employee */}
              <div className="flex items-center gap-3">
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: '#618FF5' }}>
                  {empInitials(selectedRequest.employee_id)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedRequest.employee_name || empName(selectedRequest.employee_id)}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280' }}>{selectedRequest.department || empDept(selectedRequest.employee_id)}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Leave Type</span><p style={{ fontWeight: 500 }}>{selectedRequest.leave_type}</p></div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Start Date</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedRequest.start_date)}</p></div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>End Date</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedRequest.end_date)}</p></div>
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Duration</span>
                  <p style={{ fontWeight: 600, color: '#1D4ED8' }}>{selectedRequest.total_days} day(s){selectedRequest.is_half_day ? ' (Half-day)' : ''}</p>
                </div>
                <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Submitted</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedRequest.submitted_at || '')}</p></div>
                {selectedRequest.approved_at && (
                  <div><span style={{ color: '#a3a3a3', fontSize: '11px' }}>Approved</span><p style={{ fontWeight: 500 }}>{fmtDate(selectedRequest.approved_at)}</p></div>
                )}
              </div>

              {/* Reason */}
              <div>
                <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Reason</span>
                <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>{selectedRequest.reason}</p>
              </div>

              {/* Supporting document */}
              {selectedRequest.supporting_document && (
                <div>
                  <span style={{ color: '#a3a3a3', fontSize: '11px' }}>Supporting Document</span>
                  <p style={{ fontSize: '12px', fontWeight: 500, marginTop: '2px', color: '#618FF5' }}>{selectedRequest.supporting_document}</p>
                </div>
              )}

              {/* Rejection reason */}
              {selectedRequest.rejection_reason && (
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B' }}>Rejection Reason</span>
                  <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {/* Approval chain */}
              <div>
                <span style={{ color: '#a3a3a3', fontSize: '11px', display: 'block', marginBottom: '8px' }}>Approval Chain</span>
                <ApprovalWorkflow steps={[
                  { label: 'Submitted', status: 'APPROVED', approver: 'Employee' },
                  {
                    label: 'Department Manager',
                    status: selectedRequest.approver_1_status === 'APPROVED' ? 'APPROVED' :
                           selectedRequest.approver_1_status === 'REJECTED' ? 'REJECTED' : 'PENDING',
                    approver: 'Dept. Head',
                  },
                  {
                    label: 'HR Review',
                    status: selectedRequest.approver_2_status === 'APPROVED' ? 'APPROVED' :
                           selectedRequest.approver_2_status === 'REJECTED' ? 'REJECTED' : 'NOT_STARTED',
                    approver: 'HR Department',
                  },
                  ...(selectedRequest.total_days > 14 ? [{
                    label: 'CEO Approval',
                    status: 'NOT_STARTED' as const,
                    approver: 'CEO',
                  }] : []),
                ]} />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3" style={{ borderTop: '1px solid #e4e4e4', position: 'sticky', bottom: 0, backgroundColor: '#f9fafb' }}>
              <button className="btn-secondary" onClick={() => setSelectedRequest(null)}>Close</button>
              <Link href={`/hr/leaves/requests/${selectedRequest.id}`}>
                <button className="btn-secondary flex items-center gap-1"><FileText size={13} /> Full Page</button>
              </Link>
              {selectedRequest.status === 'PENDING_APPROVAL' && hasRole(['HR_ADMIN', 'Administrator', 'Doctor']) && (
                <>
                  <button
                    className="btn-primary flex items-center gap-1" style={{ backgroundColor: '#10B981' }}
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={processingId === selectedRequest.id}
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    className="btn-secondary flex items-center gap-1" style={{ color: '#EF4444', borderColor: '#FECACA' }}
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={processingId === selectedRequest.id}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}
              {selectedRequest.status === 'PENDING_APPROVAL' && (
                <button
                  className="btn-secondary flex items-center gap-1" style={{ color: '#6B7280' }}
                  onClick={() => handleCancel(selectedRequest.id)}
                  disabled={processingId === selectedRequest.id}
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
