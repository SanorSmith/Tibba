'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Briefcase, Plus, Search, ChevronRight, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';


const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#F3F4F6', text: '#6B7280' },
  PENDING_HR: { bg: '#FEF3C7', text: '#92400E' },
  PENDING_FINANCE: { bg: '#FFEDD5', text: '#9A3412' },
  PENDING_CEO: { bg: '#DBEAFE', text: '#1D4ED8' },
  APPROVED: { bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  CLOSED: { bg: '#E5E7EB', text: '#374151' },
};

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRequisitions();
  }, [statusFilter]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/recruitment/requisitions?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequisitions(data.data || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? requisitions.filter(
        (r) =>
          r.position_title?.toLowerCase().includes(search.toLowerCase()) ||
          r.requisition_number?.toLowerCase().includes(search.toLowerCase()) ||
          r.department_name?.toLowerCase().includes(search.toLowerCase())
      )
    : requisitions;

  const pendingCount = parseInt(stats?.pending_hr || 0) + parseInt(stats?.pending_finance || 0) + parseInt(stats?.pending_ceo || 0);

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Job Requisitions</h2>
          <p className="page-description">Manage hiring requests and approvals</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/recruitment/requisitions/new">
            <button className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">New Requisition</span>
            </button>
          </Link>
          <Link href="/hr/recruitment">
            <button className="btn-secondary flex items-center gap-2">
              <Briefcase size={16} />
              <span className="hidden sm:inline">Recruitment Home</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="tibbna-grid-4 tibbna-section">
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Pending Approval</p>
                  <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{pendingCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                  <Clock size={20} style={{ color: '#F59E0B' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Approved</p>
                  <p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.approved || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <CheckCircle size={20} style={{ color: '#10B981' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Rejected</p>
                  <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{stats.rejected || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                  <XCircle size={20} style={{ color: '#EF4444' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Total</p>
                  <p className="tibbna-card-value">{stats.total || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                  <FileText size={20} style={{ color: '#6366F1' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="tibbna-section flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
          <input
            type="text"
            placeholder="Search by position, number, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tibbna-input"
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="tibbna-input"
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_HR">Pending HR</option>
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="PENDING_CEO">Pending CEO</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8"><p>Loading requisitions...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8"><p>No requisitions found</p></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Requisition #</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Positions</th>
                    <th>Status</th>
                    <th>Budget Impact</th>
                    <th>Priority</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const sc = statusColors[r.status] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr
                        key={r.requisition_id}
                        onClick={() => (window.location.href = `/hr/recruitment/requisitions/${r.requisition_id}`)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{r.requisition_number}</td>
                        <td style={{ fontSize: '13px' }}>{r.position_title}</td>
                        <td style={{ fontSize: '13px' }}>{r.department_name || '-'}</td>
                        <td style={{ fontSize: '13px', textAlign: 'center' }}>{r.number_of_positions}</td>
                        <td>
                          <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {r.annual_budget_impact ? `${parseFloat(r.annual_budget_impact).toLocaleString()} IQD` : '-'}
                        </td>
                        <td>
                          {r.priority === 'URGENT' && <span className="tibbna-badge badge-error">URGENT</span>}
                          {r.priority === 'HIGH' && <span className="tibbna-badge badge-warning">HIGH</span>}
                          {r.priority === 'NORMAL' && <span className="tibbna-badge badge-info">NORMAL</span>}
                          {!r.priority && '-'}
                        </td>
                        <td style={{ fontSize: '12px', color: '#a3a3a3' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((r: any) => {
              const sc = statusColors[r.status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <Link key={r.requisition_id} href={`/hr/recruitment/requisitions/${r.requisition_id}`}>
                  <div className="tibbna-card cursor-pointer active:bg-gray-50">
                    <div className="tibbna-card-content">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.position_title}</span>
                        <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#525252' }}>
                        {r.requisition_number} | {r.department_name || 'No Dept'} | {r.number_of_positions} pos
                      </p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                        Budget: {r.annual_budget_impact ? `${parseFloat(r.annual_budget_impact).toLocaleString()} IQD` : '-'}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
