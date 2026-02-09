'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import leavesData from '@/data/hr/leaves.json';

const statusColors: Record<string, { bg: string; text: string }> = {
  APPROVED: { bg: '#D1FAE5', text: '#065F46' },
  PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  DRAFT: { bg: '#F3F4F6', text: '#374151' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function LeavesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const requests = leavesData.leave_requests;
  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);

  const approved = requests.filter(r => r.status === 'APPROVED').length;
  const pending = requests.filter(r => r.status === 'PENDING_APPROVAL').length;
  const rejected = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Leave Management</h2>
          <p className="page-description">{requests.length} leave requests this year</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/leaves/calendar">
            <button className="btn-secondary flex items-center gap-2">
              <Clock size={16} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </Link>
          <Link href="/hr/leaves/requests/new">
            <button className="btn-primary flex items-center gap-2">
              <Calendar size={16} />
              <span className="hidden sm:inline">New Request</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Requests</p><p className="tibbna-card-value">{requests.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Calendar size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Approved</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{approved}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Pending</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{pending}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><AlertCircle size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Rejected</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{rejected}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><XCircle size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
      </div>

      <div className="flex gap-2 tibbna-section flex-wrap" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {[{ v: 'all', l: 'All' }, { v: 'PENDING_APPROVAL', l: 'Pending' }, { v: 'APPROVED', l: 'Approved' }, { v: 'REJECTED', l: 'Rejected' }, { v: 'DRAFT', l: 'Draft' }].map(f => (
          <button key={f.v} onClick={() => setStatusFilter(f.v)} className={`tibbna-tab ${statusFilter === f.v ? 'tibbna-tab-active' : ''}`}>{f.l}</button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="tibbna-card hidden md:block">
        <div className="tibbna-table-container">
          <table className="tibbna-table">
            <thead><tr><th>Request #</th><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Approver</th></tr></thead>
            <tbody>
              {filtered.map(lr => {
                const sc = statusColors[lr.status] || { bg: '#F3F4F6', text: '#374151' };
                return (
                  <tr key={lr.id} onClick={() => window.location.href = `/hr/leaves/requests/${lr.id}`} className="cursor-pointer hover:bg-gray-50">
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{lr.request_number}</td>
                    <td style={{ fontSize: '13px' }}>{lr.employee_name}</td>
                    <td><span className="tibbna-badge badge-info">{lr.leave_type}</span></td>
                    <td style={{ fontSize: '13px' }}>{lr.start_date}</td>
                    <td style={{ fontSize: '13px' }}>{lr.end_date}</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{lr.total_days}</td>
                    <td><span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{lr.status.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: '13px', color: '#525252' }}>{lr.approver_name || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filtered.map(lr => {
          const sc = statusColors[lr.status] || { bg: '#F3F4F6', text: '#374151' };
          return (
            <Link key={lr.id} href={`/hr/leaves/requests/${lr.id}`}>
              <div className="tibbna-card cursor-pointer active:bg-gray-50">
                <div className="tibbna-card-content">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{lr.employee_name}</span>
                    <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{lr.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tibbna-badge badge-info" style={{ fontSize: '10px' }}>{lr.leave_type}</span>
                    <span style={{ fontSize: '12px', color: '#525252' }}>{lr.total_days} days</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{lr.start_date} → {lr.end_date}</p>
                  {lr.reason && <p style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}>{lr.reason}</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Leave Types */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Leave Types & Policies</h3></div>
        <div className="tibbna-card-content">
          <div className="tibbna-grid-3">
            {leavesData.leave_types.map(lt => (
              <div key={lt.id} style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{lt.name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#525252', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Max: {lt.max_days} days/year</span>
                  <span>Category: {lt.category}</span>
                  {lt.carry_forward && <span>Carry forward: up to {lt.max_carry} days</span>}
                  {lt.requires_doc && <span style={{ color: '#F59E0B' }}>Requires documentation</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
