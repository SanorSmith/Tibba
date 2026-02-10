'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Star, Award, TrendingUp, AlertTriangle, Plus, Target, Pencil, Trash2, X, Search, Eye } from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { PerformanceReview, Recognition, Employee } from '@/types/hr';
import performanceData from '@/data/hr/performance.json';

const ratingColor = (r: number) => r >= 4 ? '#10B981' : r >= 3 ? '#F59E0B' : '#EF4444';
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  FINALIZED: { bg: '#D1FAE5', text: '#065F46' }, SUBMITTED: { bg: '#FEF3C7', text: '#92400E' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#1D4ED8' }, NOT_STARTED: { bg: '#F3F4F6', text: '#374151' },
};
const REC_TYPES = ['EMPLOYEE_OF_MONTH', 'EXCELLENCE_AWARD', 'SPOT_AWARD', 'PEER_RECOGNITION', 'THANK_YOU'] as const;

export default function PerformancePage() {
  const [tab, setTab] = useState<'reviews' | 'recognitions'>('reviews');
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Review modals
  const [viewReview, setViewReview] = useState<PerformanceReview | null>(null);
  const [editReview, setEditReview] = useState<PerformanceReview | null>(null);
  const [deleteReview, setDeleteReview] = useState<PerformanceReview | null>(null);

  // Recognition modals
  const [showRecForm, setShowRecForm] = useState(false);
  const [editRec, setEditRec] = useState<Recognition | null>(null);
  const [deleteRec, setDeleteRec] = useState<Recognition | null>(null);
  const [recForm, setRecForm] = useState({ employee_id: '', type: 'SPOT_AWARD' as string, title: '', reason: '', recognized_by: '', monetary_reward: 0 });

  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(() => {
    try {
      setReviews(dataStore.getPerformanceReviews());
      setRecognitions(dataStore.getRecognitions());
      setEmployees(dataStore.getEmployees());
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const dist = performanceData.rating_distribution;

  const filteredReviews = useMemo(() => {
    let r = reviews;
    if (statusFilter !== 'all') r = r.filter(x => x.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(x => x.employee_name.toLowerCase().includes(q) || (x.reviewer || '').toLowerCase().includes(q));
    }
    return r;
  }, [reviews, statusFilter, searchQuery]);

  const filteredRecs = useMemo(() => {
    if (!searchQuery.trim()) return recognitions;
    const q = searchQuery.toLowerCase();
    return recognitions.filter(r => r.employee_name.toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
  }, [recognitions, searchQuery]);

  // --- Review Edit ---
  const handleEditReviewSave = useCallback(() => {
    if (!editReview) return;
    setProcessing(true);
    const ok = dataStore.updatePerformanceReview(editReview.id, {
      status: editReview.status,
      recommendation: editReview.recommendation,
      strengths: editReview.strengths,
      improvements: editReview.improvements,
    });
    if (ok) { toast.success('Review updated'); setEditReview(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [editReview, loadData]);

  const handleDeleteReview = useCallback(() => {
    if (!deleteReview) return;
    setProcessing(true);
    const ok = dataStore.deletePerformanceReview(deleteReview.id);
    if (ok) { toast.success('Review deleted'); setDeleteReview(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [deleteReview, loadData]);

  // --- Recognition CRUD ---
  const openRecForm = useCallback((rec?: Recognition) => {
    if (rec) {
      setRecForm({ employee_id: rec.employee_id, type: rec.type, title: rec.title, reason: rec.reason, recognized_by: rec.recognized_by || '', monetary_reward: rec.monetary_reward || 0 });
      setEditRec(rec);
    } else {
      setRecForm({ employee_id: '', type: 'SPOT_AWARD', title: '', reason: '', recognized_by: '', monetary_reward: 0 });
      setEditRec(null);
    }
    setShowRecForm(true);
  }, []);

  const handleRecSave = useCallback(() => {
    if (!recForm.employee_id || !recForm.title || !recForm.reason) { toast.error('Fill required fields'); return; }
    setProcessing(true);
    const emp = employees.find(e => e.id === recForm.employee_id);
    if (editRec) {
      const ok = dataStore.updateRecognition(editRec.id, {
        ...recForm, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : editRec.employee_name,
        type: recForm.type as Recognition['type'], monetary_reward: Number(recForm.monetary_reward),
      });
      if (ok) { toast.success('Recognition updated'); setShowRecForm(false); setEditRec(null); loadData(); }
      else toast.error('Failed');
    } else {
      const newId = `REC-${String(recognitions.length + 1).padStart(3, '0')}`;
      const ok = dataStore.addRecognition({
        id: newId, employee_id: recForm.employee_id,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
        type: recForm.type as Recognition['type'], title: recForm.title, reason: recForm.reason,
        recognized_by: recForm.recognized_by, date: new Date().toISOString().split('T')[0],
        monetary_reward: Number(recForm.monetary_reward),
      });
      if (ok) { toast.success('Recognition added'); setShowRecForm(false); loadData(); }
      else toast.error('Failed');
    }
    setProcessing(false);
  }, [recForm, editRec, employees, recognitions.length, loadData]);

  const handleDeleteRec = useCallback(() => {
    if (!deleteRec) return;
    setProcessing(true);
    const ok = dataStore.deleteRecognition(deleteRec.id);
    if (ok) { toast.success('Recognition removed'); setDeleteRec(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [deleteRec, loadData]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto" /></div>;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Performance Management</h2>
          <p className="page-description">Reviews, goals, and employee recognition</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/performance/goals"><button className="btn-secondary flex items-center gap-2"><Target size={16} /><span className="hidden sm:inline">Goals</span></button></Link>
          {tab === 'reviews' ? (
            <Link href="/hr/performance/reviews/new"><button className="btn-primary flex items-center gap-2"><Plus size={16} /><span className="hidden sm:inline">New Review</span></button></Link>
          ) : (
            <button onClick={() => openRecForm()} className="btn-primary flex items-center gap-2"><Plus size={16} /><span className="hidden sm:inline">Add Recognition</span></button>
          )}
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Rating</p><p className="tibbna-card-value" style={{ color: ratingColor(dist.avg_rating) }}>{dist.avg_rating}/5</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Star size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Reviews</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{reviews.filter(r => r.status === 'FINALIZED').length}/{reviews.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><TrendingUp size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">In Progress</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{reviews.filter(r => r.status === 'IN_PROGRESS' || r.status === 'SUBMITTED').length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><AlertTriangle size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Recognitions</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{recognitions.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><Award size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Rating Distribution */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Rating Distribution</h3></div>
        <div className="tibbna-card-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dist.distribution.map(d => (
              <div key={d.rating} className="flex items-center gap-3">
                <span style={{ fontSize: '13px', width: '160px', flexShrink: 0 }}>{d.rating}</span>
                <div style={{ flex: 1, height: '20px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.percentage}%`, backgroundColor: d.rating.includes('Outstanding') ? '#10B981' : d.rating.includes('Exceeds') ? '#3B82F6' : d.rating.includes('Meets') ? '#F59E0B' : '#EF4444', borderRadius: '4px', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, width: '60px', textAlign: 'right' }}>{d.count} ({d.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <div className="flex gap-2">
          <button onClick={() => setTab('reviews')} className={`tibbna-tab ${tab === 'reviews' ? 'tibbna-tab-active' : ''}`}>Reviews ({reviews.length})</button>
          <button onClick={() => setTab('recognitions')} className={`tibbna-tab ${tab === 'recognitions' ? 'tibbna-tab-active' : ''}`}>Recognitions ({recognitions.length})</button>
        </div>
        <div className="flex gap-2">
          {tab === 'reviews' && (
            <select className="tibbna-input" style={{ width: 'auto', fontSize: '12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="FINALIZED">Finalized</option><option value="SUBMITTED">Submitted</option>
              <option value="IN_PROGRESS">In Progress</option><option value="NOT_STARTED">Not Started</option>
            </select>
          )}
          <div className="relative" style={{ width: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
            <input className="tibbna-input" style={{ paddingLeft: '32px', fontSize: '12px' }} placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div className="space-y-3">
          {filteredReviews.map(r => {
            const sc = STATUS_COLORS[r.status] || { bg: '#F3F4F6', text: '#374151' };
            return (
              <div key={r.id} className="tibbna-card">
                <div className="tibbna-card-content">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link href={`/hr/employees/${r.employee_id}`} style={{ fontSize: '15px', fontWeight: 600, color: '#618FF5' }} className="hover:underline">{r.employee_name}</Link>
                        <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{r.status}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#525252' }}>Reviewer: {r.reviewer}</p>
                      {r.strengths && <p style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}><strong>Strengths:</strong> {r.strengths.substring(0, 80)}…</p>}
                      {r.recommendation && <p style={{ fontSize: '12px', color: '#6366F1', marginTop: '2px' }}>{r.recommendation}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ textAlign: 'center', minWidth: '60px' }}>
                        <p style={{ fontSize: '28px', fontWeight: 700, color: ratingColor(r.overall_rating) }}>{r.overall_rating}</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>out of 5</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setViewReview(r)} className="btn-secondary" style={{ padding: '3px 8px' }}><Eye size={12} /></button>
                        <button onClick={() => setEditReview({ ...r })} className="btn-secondary" style={{ padding: '3px 8px' }}><Pencil size={12} /></button>
                        <button onClick={() => setDeleteReview(r)} className="btn-secondary" style={{ padding: '3px 8px', color: '#DC2626' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                  {/* Competency Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                    {[
                      { label: 'Clinical', value: r.clinical_competence },
                      { label: 'Patient Care', value: r.patient_care },
                      { label: 'Professional', value: r.professionalism },
                      { label: 'Teamwork', value: r.teamwork },
                      { label: 'Quality', value: r.quality_safety },
                    ].filter(c => c.value != null).map(c => (
                      <div key={c.label}>
                        <div className="flex justify-between" style={{ fontSize: '11px', color: '#a3a3a3' }}>
                          <span>{c.label}</span>
                          <span style={{ fontWeight: 600, color: ratingColor(c.value!) }}>{c.value}</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', marginTop: '2px' }}>
                          <div style={{ height: '100%', width: `${(c.value! / 5) * 100}%`, backgroundColor: ratingColor(c.value!), borderRadius: '2px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredReviews.length === 0 && <div className="tibbna-card"><div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>No reviews match filters</div></div>}
        </div>
      )}

      {/* Recognitions Tab */}
      {tab === 'recognitions' && (
        <div className="space-y-3">
          {filteredRecs.map(rec => (
            <div key={rec.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                    <Award size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{rec.title}</h4>
                      <span className="tibbna-badge badge-warning" style={{ fontSize: '10px' }}>{rec.type.replace(/_/g, ' ')}</span>
                    </div>
                    <Link href={`/hr/employees/${rec.employee_id}`} style={{ fontSize: '14px', fontWeight: 500, color: '#618FF5' }} className="hover:underline">{rec.employee_name}</Link>
                    <p style={{ fontSize: '13px', color: '#525252', marginTop: '4px' }}>{rec.reason}</p>
                    <div className="flex items-center gap-4 mt-2" style={{ fontSize: '12px', color: '#a3a3a3' }}>
                      <span>By: {rec.recognized_by || rec.awarded_by || '-'}</span>
                      <span>{rec.date}</span>
                      {(rec.monetary_reward || 0) > 0 && <span style={{ color: '#10B981', fontWeight: 600 }}>{((rec.monetary_reward || 0) / 1000).toFixed(0)}K IQD</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => openRecForm(rec)} className="btn-secondary" style={{ padding: '3px 8px' }}><Pencil size={12} /></button>
                    <button onClick={() => setDeleteRec(rec)} className="btn-secondary" style={{ padding: '3px 8px', color: '#DC2626' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredRecs.length === 0 && <div className="tibbna-card"><div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>No recognitions found</div></div>}
        </div>
      )}

      {/* View Review Modal */}
      {viewReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Review: {viewReview.employee_name}</h3>
              <button onClick={() => setViewReview(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Reviewer</p>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{viewReview.reviewer}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '36px', fontWeight: 700, color: ratingColor(viewReview.overall_rating) }}>{viewReview.overall_rating}</p>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Overall / 5</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Clinical Competence', value: viewReview.clinical_competence },
                  { label: 'Patient Care', value: viewReview.patient_care },
                  { label: 'Professionalism', value: viewReview.professionalism },
                  { label: 'Teamwork', value: viewReview.teamwork },
                  { label: 'Quality & Safety', value: viewReview.quality_safety },
                ].filter(c => c.value != null).map(c => (
                  <div key={c.label} style={{ padding: '8px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.label}</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: ratingColor(c.value!) }}>{c.value}/5</p>
                  </div>
                ))}
              </div>
              {viewReview.strengths && <div><p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>Strengths</p><p style={{ fontSize: '13px', color: '#525252' }}>{viewReview.strengths}</p></div>}
              {viewReview.improvements && <div><p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>Areas for Improvement</p><p style={{ fontSize: '13px', color: '#525252' }}>{viewReview.improvements}</p></div>}
              {viewReview.recommendation && <div><p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>Recommendation</p><p style={{ fontSize: '13px', color: '#6366F1' }}>{viewReview.recommendation}</p></div>}
            </div>
            <div className="flex justify-end px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setViewReview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Edit Review: {editReview.employee_name}</h3>
              <button onClick={() => setEditReview(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</label>
                <select className="tibbna-input" value={editReview.status} onChange={e => setEditReview({ ...editReview, status: e.target.value as PerformanceReview['status'] })}>
                  <option value="NOT_STARTED">Not Started</option><option value="IN_PROGRESS">In Progress</option>
                  <option value="SUBMITTED">Submitted</option><option value="FINALIZED">Finalized</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Recommendation</label>
                <input className="tibbna-input" value={editReview.recommendation || ''} onChange={e => setEditReview({ ...editReview, recommendation: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Strengths</label>
                <textarea className="tibbna-input" rows={2} value={editReview.strengths || ''} onChange={e => setEditReview({ ...editReview, strengths: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Improvements</label>
                <textarea className="tibbna-input" rows={2} value={editReview.improvements || ''} onChange={e => setEditReview({ ...editReview, improvements: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setEditReview(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditReviewSave} disabled={processing}>{processing ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Review Confirmation */}
      {deleteReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><AlertTriangle size={24} style={{ color: '#DC2626' }} /></div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Delete Review?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>Delete review for <strong>{deleteReview.employee_name}</strong>? This cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteReview(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteReview} disabled={processing}>{processing ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Recognition Form Modal */}
      {showRecForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{editRec ? 'Edit Recognition' : 'Add Recognition'}</h3>
              <button onClick={() => { setShowRecForm(false); setEditRec(null); }} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select className="tibbna-input" value={recForm.employee_id} onChange={e => setRecForm({ ...recForm, employee_id: e.target.value })}>
                  <option value="">Select…</option>
                  {employees.filter(e => e.employment_status === 'ACTIVE').map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.job_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Type *</label>
                  <select className="tibbna-input" value={recForm.type} onChange={e => setRecForm({ ...recForm, type: e.target.value })}>
                    {REC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reward (IQD)</label>
                  <input className="tibbna-input" type="number" value={recForm.monetary_reward} onChange={e => setRecForm({ ...recForm, monetary_reward: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title *</label>
                <input className="tibbna-input" value={recForm.title} onChange={e => setRecForm({ ...recForm, title: e.target.value })} placeholder="Recognition title" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason *</label>
                <textarea className="tibbna-input" rows={2} value={recForm.reason} onChange={e => setRecForm({ ...recForm, reason: e.target.value })} placeholder="Why is this employee being recognized?" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Recognized By</label>
                <input className="tibbna-input" value={recForm.recognized_by} onChange={e => setRecForm({ ...recForm, recognized_by: e.target.value })} placeholder="Manager name" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => { setShowRecForm(false); setEditRec(null); }}>Cancel</button>
              <button className="btn-primary" onClick={handleRecSave} disabled={processing || !recForm.employee_id || !recForm.title}>{processing ? 'Saving…' : editRec ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Recognition Confirmation */}
      {deleteRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><AlertTriangle size={24} style={{ color: '#DC2626' }} /></div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Delete Recognition?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>Remove <strong>{deleteRec.title}</strong> for <strong>{deleteRec.employee_name}</strong>?</p>
            </div>
            <div className="flex justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteRec(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteRec} disabled={processing}>{processing ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
