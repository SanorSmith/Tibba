'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Filter, Search } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import leavesData from '@/data/hr/leaves.json';

export default function LeaveRequestsListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const requests = leavesData.leave_requests;
  const leaveTypes = [...new Set(requests.map(r => r.leave_type))].sort();

  const filtered = useMemo(() => {
    let data = requests;
    if (statusFilter !== 'all') data = data.filter(r => r.status === statusFilter);
    if (typeFilter !== 'all') data = data.filter(r => r.leave_type === typeFilter);
    if (search) data = data.filter(r => r.employee_name.toLowerCase().includes(search.toLowerCase()) || r.request_number.toLowerCase().includes(search.toLowerCase()));
    return data;
  }, [requests, statusFilter, typeFilter, search]);

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    pending: requests.filter(r => r.status === 'PENDING_APPROVAL').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Requests</h2>
            <p className="page-description">{stats.total} total requests</p>
          </div>
        </div>
        <Link href="/hr/leaves/requests/new">
          <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Request</button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Total</p><p className="tibbna-card-value">{stats.total}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Approved</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.approved}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Pending</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.pending}</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Rejected</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{stats.rejected}</p></div></div>
      </div>

      {/* Filters */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
              <input className="tibbna-input" style={{ paddingLeft: '32px' }} placeholder="Search by name or request #..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tibbna-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Leave Types</option>
              {leaveTypes.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Request #</th><th>Employee</th><th>Leave Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{r.request_number}</td>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{r.employee_name}</td>
                    <td style={{ fontSize: '12px' }}>{r.leave_type}</td>
                    <td style={{ fontSize: '12px' }}>{r.start_date}</td>
                    <td style={{ fontSize: '12px' }}>{r.end_date}</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{r.total_days}</td>
                    <td><SmartStatusBadge status={r.status} /></td>
                    <td><Link href={`/hr/leaves/requests/${r.id}`}><button className="btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>View</button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {filtered.slice(0, 20).map(r => (
              <Link key={r.id} href={`/hr/leaves/requests/${r.id}`}>
                <div style={{ padding: '10px', border: '1px solid #e4e4e4', cursor: 'pointer' }} className="hover:bg-[#f9fafb]">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.employee_name}</span>
                    <SmartStatusBadge status={r.status} />
                  </div>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{r.request_number} | {r.leave_type} | {r.start_date} → {r.end_date} ({r.total_days}d)</p>
                </div>
              </Link>
            ))}
            {filtered.length > 20 && <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' }}>+{filtered.length - 20} more</p>}
          </div>
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '32px' }}>No requests match filters</p>}
        </div>
      </div>
    </>
  );
}
