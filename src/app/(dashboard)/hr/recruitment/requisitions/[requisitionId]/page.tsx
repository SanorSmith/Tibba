'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, Send, Edit } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#F3F4F6', text: '#6B7280' },
  PENDING_HR: { bg: '#FEF3C7', text: '#92400E' },
  PENDING_FINANCE: { bg: '#FFEDD5', text: '#9A3412' },
  PENDING_CEO: { bg: '#DBEAFE', text: '#1D4ED8' },
  APPROVED: { bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function RequisitionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [requisition, setRequisition] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [linkedVacancy, setLinkedVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approverRole, setApproverRole] = useState('HR_DIRECTOR');

  useEffect(() => {
    fetchRequisition();
  }, [params.requisitionId]);

  const fetchRequisition = async () => {
    try {
      const res = await fetch(`/api/recruitment/requisitions/${params.requisitionId}`);
      const data = await res.json();
      if (data.success) {
        setRequisition(data.data);
        setApprovalHistory(data.approvalHistory || []);
        setLinkedVacancy(data.linkedVacancy);
      } else {
        toast.error(data.error || 'Not found');
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`/api/recruitment/requisitions/${params.requisitionId}/submit`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success('Submitted for approval'); fetchRequisition(); }
      else toast.error(data.error);
    } catch { toast.error('Failed to submit'); }
  };

  const handleApproval = async () => {
    try {
      const res = await fetch(`/api/recruitment/requisitions/${params.requisitionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverRole,
          action: approvalAction === 'approve' ? 'APPROVED' : 'REJECTED',
          comments: approvalNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Requisition ${approvalAction}d`);
        setShowApproveModal(false);
        setApprovalNotes('');
        fetchRequisition();
      } else toast.error(data.error);
    } catch { toast.error('Failed to process'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this draft requisition?')) return;
    try {
      const res = await fetch(`/api/recruitment/requisitions/${params.requisitionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Deleted'); router.push('/hr/recruitment/requisitions'); }
      else toast.error(data.error);
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!requisition) return <div className="text-center py-8">Requisition not found</div>;

  const sc = statusColors[requisition.status] || { bg: '#F3F4F6', text: '#374151' };

  return (
    <>
      {/* Header */}
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="page-title">{requisition.requisition_number}</h2>
              <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '12px' }}>
                {requisition.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="page-description">{requisition.position_title}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {requisition.status === 'DRAFT' && (
            <>
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-2"><Send size={16} /> Submit</button>
              <Link href={`/hr/recruitment/requisitions/${params.requisitionId}/edit`}>
                <button className="btn-secondary flex items-center gap-2"><Edit size={16} /> Edit</button>
              </Link>
              <button onClick={handleDelete} className="btn-secondary" style={{ color: '#EF4444' }}>Delete</button>
            </>
          )}
          {(requisition.status === 'PENDING_HR' || requisition.status === 'PENDING_FINANCE' || requisition.status === 'PENDING_CEO') && (
            <>
              <button onClick={() => { setApprovalAction('approve'); setShowApproveModal(true); }} className="btn-primary flex items-center gap-2">
                <Check size={16} /> Approve
              </button>
              <button onClick={() => { setApprovalAction('reject'); setShowApproveModal(true); }} className="btn-secondary flex items-center gap-2" style={{ color: '#EF4444' }}>
                <X size={16} /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Approval Timeline */}
      {approvalHistory.length > 0 && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Approval Timeline</h3></div>
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {approvalHistory.map((ah: any, i: number) => (
                <div key={i} className="flex items-start gap-3" style={{ padding: '8px 0', borderBottom: i < approvalHistory.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ah.action === 'APPROVED' ? '#D1FAE5' : '#FEE2E2' }}>
                    {ah.action === 'APPROVED' ? <Check size={14} style={{ color: '#065F46' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{ah.approver_role?.replace(/_/g, ' ')}</p>
                      <span className="tibbna-badge" style={{ backgroundColor: ah.action === 'APPROVED' ? '#D1FAE5' : '#FEE2E2', color: ah.action === 'APPROVED' ? '#065F46' : '#991B1B', fontSize: '10px' }}>
                        {ah.action}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{ah.approver_name || 'Unknown'} | {ah.approved_at ? new Date(ah.approved_at).toLocaleString() : '-'}</p>
                    {ah.notes && <p style={{ fontSize: '12px', color: '#525252', marginTop: 4 }}>{ah.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Position Details</h3></div>
          <div className="tibbna-card-content space-y-2">
            <InfoRow label="Position Title" value={requisition.position_title} />
            <InfoRow label="Department" value={requisition.department_name || '-'} />
            <InfoRow label="Employment Type" value={requisition.employment_type?.replace(/_/g, ' ') || '-'} />
            <InfoRow label="Number of Positions" value={requisition.number_of_positions} />
            <InfoRow label="Location" value={requisition.location || '-'} />
            <InfoRow label="Priority" value={requisition.priority || '-'} />
            <InfoRow label="Required By" value={requisition.required_by_date ? new Date(requisition.required_by_date).toLocaleDateString() : '-'} />
            <InfoRow label="Requested By" value={requisition.requester_name || '-'} />
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Budget Information</h3></div>
          <div className="tibbna-card-content space-y-2">
            <InfoRow label="Salary Min" value={requisition.salary_min ? `${parseFloat(requisition.salary_min).toLocaleString()} IQD` : '-'} />
            <InfoRow label="Salary Max" value={requisition.salary_max ? `${parseFloat(requisition.salary_max).toLocaleString()} IQD` : '-'} />
            <InfoRow label="Annual Budget Impact" value={requisition.annual_budget_impact ? `${parseFloat(requisition.annual_budget_impact).toLocaleString()} IQD` : '-'} />
            <InfoRow label="Currency" value={requisition.currency || 'IQD'} />
          </div>
        </div>
      </div>

      {/* Description Sections */}
      {requisition.business_justification && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Business Justification</h3></div>
          <div className="tibbna-card-content"><p style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{requisition.business_justification}</p></div>
        </div>
      )}
      {requisition.job_description && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Job Description</h3></div>
          <div className="tibbna-card-content"><p style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{requisition.job_description}</p></div>
        </div>
      )}

      {/* Linked Vacancy */}
      {linkedVacancy && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Linked Vacancy</h3></div>
          <div className="tibbna-card-content">
            <Link href={`/hr/recruitment/vacancies/${linkedVacancy.id}`} style={{ color: '#3B82F6', fontSize: '14px', fontWeight: 500 }}>
              {linkedVacancy.vacancy_number} - {linkedVacancy.position} ({linkedVacancy.status})
            </Link>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="tibbna-card" style={{ width: '100%', maxWidth: 480, margin: 16 }}>
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Requisition
              </h3>
            </div>
            <div className="tibbna-card-content space-y-4">
              <p style={{ fontSize: '13px', color: '#525252' }}>
                {approvalAction === 'approve'
                  ? 'This will move the requisition to the next approval stage.'
                  : 'This will reject the requisition.'}
              </p>
              <div>
                <label className="tibbna-label">Approver Role</label>
                <select value={approverRole} onChange={(e) => setApproverRole(e.target.value)} className="tibbna-input">
                  <option value="HR_DIRECTOR">HR Director</option>
                  <option value="FINANCE_MANAGER">Finance Manager</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>
              <div>
                <label className="tibbna-label">Notes (Optional)</label>
                <textarea rows={3} value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} className="tibbna-input" placeholder="Add notes..." style={{ resize: 'vertical' }} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowApproveModal(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleApproval}
                  className={approvalAction === 'approve' ? 'btn-primary' : 'btn-secondary'}
                  style={approvalAction === 'reject' ? { backgroundColor: '#FEE2E2', color: '#991B1B' } : {}}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between" style={{ padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: '13px', color: '#a3a3a3' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{value ?? '-'}</span>
    </div>
  );
}
