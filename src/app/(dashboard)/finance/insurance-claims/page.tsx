'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Plus, Search, Eye, CheckCircle, XCircle,
  DollarSign, RefreshCw, X, AlertTriangle, Clock,
  TrendingUp, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Claim {
  id: string;
  claim_number: string;
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  patient_name_ar: string;
  insurance_company_id: string;
  insurance_company_name: string;
  claim_amount: number;
  approved_amount: number;
  paid_amount: number;
  status: string;
  service_date: string;
  submission_date: string;
  approval_date: string;
  payment_date: string;
  rejection_reason: string;
  notes: string;
  created_at: string;
}

interface Stats {
  total_claims: string;
  total_claimed: string;
  total_approved: string;
  total_paid: string;
  pending_amount: string;
  submitted_count: string;
  approved_count: string;
  paid_count: string;
  rejected_count: string;
  review_count: string;
}

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Number(n) || 0);

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUBMITTED:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700',    icon: <FileText className="w-3 h-3" /> },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-3 h-3" /> },
  APPROVED:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED:     { label: 'Rejected',     color: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> },
  PAID:         { label: 'Paid',         color: 'bg-green-100 text-green-800',   icon: <DollarSign className="w-3 h-3" /> },
  PARTIALLY_PAID: { label: 'Partial',   color: 'bg-purple-100 text-purple-700', icon: <DollarSign className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'bg-gray-100 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InsuranceClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('');

  // Modals
  const [viewClaim, setViewClaim] = useState<Claim | null>(null);
  const [approveClaim, setApproveClaim] = useState<Claim | null>(null);
  const [rejectClaim, setRejectClaim] = useState<Claim | null>(null);
  const [paymentClaim, setPaymentClaim] = useState<Claim | null>(null);

  // Modal form state
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      if (companyFilter) qs.set('insurance_company_id', companyFilter);

      const [claimsRes, companiesRes] = await Promise.all([
        fetch(`/api/insurance-claims?${qs}`),
        fetch('/api/insurance-companies'),
      ]);

      if (claimsRes.ok) {
        const d = await claimsRes.json();
        setClaims(d.data || []);
        setStats(d.stats || null);
      }
      if (companiesRes.ok) {
        const d = await companiesRes.json();
        setCompanies(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companyFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = claims.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.claim_number?.toLowerCase().includes(s) ||
      c.invoice_number?.toLowerCase().includes(s) ||
      c.patient_name?.toLowerCase().includes(s) ||
      c.patient_name_ar?.toLowerCase().includes(s) ||
      c.insurance_company_name?.toLowerCase().includes(s)
    );
  });

  // ── Actions ──────────────────────────────────────────────────────────────────

  const doAction = async (id: string, body: object, successMsg: string) => {
    const res = await fetch(`/api/insurance-claims/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(successMsg);
      loadData();
      return true;
    }
    const err = await res.json();
    toast.error(err.error || 'Action failed');
    return false;
  };

  const handleApprove = async () => {
    if (!approveClaim) return;
    const ok = await doAction(
      approveClaim.id,
      { action: 'approve', approved_amount: approvedAmount },
      `Claim ${approveClaim.claim_number} approved`
    );
    if (ok) setApproveClaim(null);
  };

  const handleReject = async () => {
    if (!rejectClaim) return;
    const ok = await doAction(
      rejectClaim.id,
      { action: 'reject', rejection_reason: rejectionReason },
      `Claim ${rejectClaim.claim_number} rejected`
    );
    if (ok) setRejectClaim(null);
  };

  const handleRecordPayment = async () => {
    if (!paymentClaim) return;
    const ok = await doAction(
      paymentClaim.id,
      { action: 'record_payment', paid_amount: paymentAmount, payment_date: paymentDate },
      `Payment recorded for ${paymentClaim.claim_number}`
    );
    if (ok) setPaymentClaim(null);
  };

  const handleMarkReview = async (claim: Claim) => {
    await doAction(claim.id, { action: 'under_review' }, `Claim ${claim.claim_number} marked Under Review`);
  };

  const handleResubmit = async (claim: Claim) => {
    await doAction(claim.id, { action: 'resubmit' }, `Claim ${claim.claim_number} resubmitted`);
  };

  const handleDelete = async (claim: Claim) => {
    if (!confirm(`Delete claim ${claim.claim_number}?`)) return;
    const res = await fetch(`/api/insurance-claims/${claim.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Claim deleted'); loadData(); }
    else { const e = await res.json(); toast.error(e.error || 'Delete failed'); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Insurance Claims
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track, submit, and reconcile insurance claims
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500">Total Claims</div>
            <div className="text-2xl font-bold mt-1">{stats.total_claims}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.submitted_count} submitted · {stats.review_count} in review
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500">Total Claimed</div>
            <div className="text-xl font-bold mt-1 text-gray-900">{fmt(stats.total_claimed)}</div>
            <div className="text-xs text-gray-400 mt-1">IQD</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500">Approved</div>
            <div className="text-xl font-bold mt-1 text-emerald-600">{fmt(stats.total_approved)}</div>
            <div className="text-xs text-gray-400 mt-1">{stats.approved_count} claims</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500">Paid by Insurance</div>
            <div className="text-xl font-bold mt-1 text-green-700">{fmt(stats.total_paid)}</div>
            <div className="text-xs text-gray-400 mt-1">{stats.paid_count} fully paid</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-xs text-gray-500">Pending / Rejected</div>
            <div className="text-xl font-bold mt-1 text-amber-600">{fmt(stats.pending_amount)}</div>
            <div className="text-xs text-gray-400 mt-1">{stats.rejected_count} rejected</div>
          </div>
        </div>
      )}

      {/* Tip when empty */}
      {claims.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>How to submit a claim:</strong> Go to Finance → Customer Invoices, find an invoice
          that has insurance coverage, and click the <strong>Submit Claim</strong> button in the
          Actions column.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search claim #, invoice #, patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Claims Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Claim #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance Company</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Claimed (IQD)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Approved (IQD)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Paid (IQD)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{claim.claim_number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{claim.invoice_number || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{claim.patient_name_ar || claim.patient_name || '-'}</div>
                    {claim.patient_id && <div className="text-xs text-gray-400">{claim.patient_id}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{claim.insurance_company_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(claim.claim_amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {Number(claim.approved_amount) > 0 ? fmt(claim.approved_amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {Number(claim.paid_amount) > 0 ? fmt(claim.paid_amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {claim.submission_date
                      ? new Date(claim.submission_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {/* View */}
                      <button
                        onClick={() => setViewClaim(claim)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>

                      {/* Mark Under Review (only SUBMITTED) */}
                      {claim.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleMarkReview(claim)}
                          className="p-1 hover:bg-amber-50 rounded"
                          title="Mark Under Review"
                        >
                          <Clock className="w-4 h-4 text-amber-600" />
                        </button>
                      )}

                      {/* Approve (SUBMITTED or UNDER_REVIEW) */}
                      {['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && (
                        <button
                          onClick={() => {
                            setApproveClaim(claim);
                            setApprovedAmount(Number(claim.claim_amount));
                          }}
                          className="p-1 hover:bg-emerald-50 rounded"
                          title="Approve Claim"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}

                      {/* Reject (SUBMITTED or UNDER_REVIEW) */}
                      {['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && (
                        <button
                          onClick={() => { setRejectClaim(claim); setRejectionReason(''); }}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Reject Claim"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      )}

                      {/* Record Payment (APPROVED or PARTIALLY_PAID) */}
                      {['APPROVED', 'PARTIALLY_PAID'].includes(claim.status) && (
                        <button
                          onClick={() => {
                            setPaymentClaim(claim);
                            setPaymentAmount(
                              Number(claim.approved_amount) - Number(claim.paid_amount)
                            );
                          }}
                          className="p-1 hover:bg-green-50 rounded"
                          title="Record Payment"
                        >
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </button>
                      )}

                      {/* Resubmit (REJECTED) */}
                      {claim.status === 'REJECTED' && (
                        <button
                          onClick={() => handleResubmit(claim)}
                          className="p-1 hover:bg-blue-50 rounded"
                          title="Resubmit Claim"
                        >
                          <RefreshCw className="w-4 h-4 text-blue-500" />
                        </button>
                      )}

                      {/* Delete (SUBMITTED or REJECTED only) */}
                      {['SUBMITTED', 'REJECTED'].includes(claim.status) && (
                        <button
                          onClick={() => handleDelete(claim)}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Delete Claim"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No insurance claims found</p>
            <p className="text-sm mt-1">
              Submit claims from the Invoices page for invoices that have insurance coverage
            </p>
          </div>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      {viewClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{viewClaim.claim_number}</h2>
                <StatusBadge status={viewClaim.status} />
              </div>
              <button onClick={() => setViewClaim(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500 text-xs block">Invoice</span>{viewClaim.invoice_number || '-'}</div>
                <div><span className="text-gray-500 text-xs block">Patient</span>{viewClaim.patient_name_ar || viewClaim.patient_name || '-'}</div>
                <div className="col-span-2"><span className="text-gray-500 text-xs block">Insurance Company</span>{viewClaim.insurance_company_name || '-'}</div>
                <div><span className="text-gray-500 text-xs block">Service Date</span>{viewClaim.service_date ? new Date(viewClaim.service_date).toLocaleDateString() : '-'}</div>
                <div><span className="text-gray-500 text-xs block">Submitted</span>{viewClaim.submission_date ? new Date(viewClaim.submission_date).toLocaleDateString() : '-'}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Claim Amount</span><span className="font-semibold">{fmt(viewClaim.claim_amount)} IQD</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Approved Amount</span><span className="font-semibold text-emerald-700">{fmt(viewClaim.approved_amount)} IQD</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-600">Paid by Insurance</span><span className="font-bold text-green-700">{fmt(viewClaim.paid_amount)} IQD</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Outstanding</span><span className="font-bold text-red-600">{fmt(Number(viewClaim.approved_amount) - Number(viewClaim.paid_amount))} IQD</span></div>
              </div>

              {viewClaim.approval_date && (
                <div><span className="text-gray-500 text-xs block">Approval Date</span>{new Date(viewClaim.approval_date).toLocaleDateString()}</div>
              )}
              {viewClaim.payment_date && (
                <div><span className="text-gray-500 text-xs block">Payment Date</span>{new Date(viewClaim.payment_date).toLocaleDateString()}</div>
              )}
              {viewClaim.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-xs font-medium text-red-800 block mb-1">Rejection Reason</span>
                  <p className="text-red-700 text-sm">{viewClaim.rejection_reason}</p>
                </div>
              )}
              {viewClaim.notes && (
                <div><span className="text-gray-500 text-xs block">Notes</span>{viewClaim.notes}</div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setViewClaim(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {approveClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Approve Claim
              </h2>
              <button onClick={() => setApproveClaim(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium">{approveClaim.claim_number}</div>
                <div className="text-gray-500">{approveClaim.insurance_company_name}</div>
                <div className="text-gray-500 mt-1">Claimed: <strong>{fmt(approveClaim.claim_amount)} IQD</strong></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Approved Amount (IQD) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  May differ from claimed amount if partially approved
                </p>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setApproveClaim(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Approve Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" /> Reject Claim
              </h2>
              <button onClick={() => setRejectClaim(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium">{rejectClaim.claim_number}</div>
                <div className="text-gray-500">{rejectClaim.insurance_company_name}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Explain why the claim is being rejected..."
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                The claim can be resubmitted after rejection if the issue is resolved.
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setRejectClaim(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Reject Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {paymentClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" /> Record Insurance Payment
              </h2>
              <button onClick={() => setPaymentClaim(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium">{paymentClaim.claim_number}</div>
                <div className="text-gray-500">{paymentClaim.insurance_company_name}</div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">Approved:</span>
                  <span className="font-medium">{fmt(paymentClaim.approved_amount)} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Already paid:</span>
                  <span className="font-medium text-green-700">{fmt(paymentClaim.paid_amount)} IQD</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className="font-bold text-red-600">
                    {fmt(Number(paymentClaim.approved_amount) - Number(paymentClaim.paid_amount))} IQD
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Amount (IQD) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setPaymentClaim(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
