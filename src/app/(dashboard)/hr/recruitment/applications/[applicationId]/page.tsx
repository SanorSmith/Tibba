'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, MessageSquare, FileText, Award, Send } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#DBEAFE', text: '#1D4ED8' },
  SCREENING: { bg: '#E0E7FF', text: '#4338CA' },
  INTERVIEWING: { bg: '#FEF3C7', text: '#92400E' },
  OFFERED: { bg: '#D1FAE5', text: '#065F46' },
  HIRED: { bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  WITHDRAWN: { bg: '#E5E7EB', text: '#374151' },
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'interviews' | 'assessments' | 'notes'>('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [params.applicationId]);

  const fetchApplication = async () => {
    try {
      const res = await fetch(`/api/recruitment/applications/${params.applicationId}`);
      const json = await res.json();
      if (json.success) setData(json);
      else toast.error(json.error || 'Not found');
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/recruitment/applications/${params.applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, noteType: 'GENERAL' }),
      });
      const json = await res.json();
      if (json.success) { toast.success('Note added'); setNewNote(''); fetchApplication(); }
      else toast.error(json.error);
    } catch { toast.error('Failed to add note'); }
    finally { setAddingNote(false); }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!data) return <div className="text-center py-8">Application not found</div>;

  const app = data.data;
  const sc = statusColors[app.status] || { bg: '#F3F4F6', text: '#374151' };

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
              <h2 className="page-title">{app.first_name} {app.last_name}</h2>
              <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{app.status}</span>
            </div>
            <p className="page-description">{app.vacancy_position || app.position} | {app.application_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/recruitment/interviews/schedule?applicationId=${params.applicationId}`}>
            <button className="btn-primary flex items-center gap-2"><Calendar size={16} /> Schedule Interview</button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <button onClick={() => setTab('overview')} className={`tibbna-tab ${tab === 'overview' ? 'tibbna-tab-active' : ''}`}>Overview</button>
        <button onClick={() => setTab('interviews')} className={`tibbna-tab ${tab === 'interviews' ? 'tibbna-tab-active' : ''}`}>
          Interviews ({data.interviews?.length || 0})
        </button>
        <button onClick={() => setTab('assessments')} className={`tibbna-tab ${tab === 'assessments' ? 'tibbna-tab-active' : ''}`}>
          Assessments ({data.assessments?.length || 0})
        </button>
        <button onClick={() => setTab('notes')} className={`tibbna-tab ${tab === 'notes' ? 'tibbna-tab-active' : ''}`}>
          Notes ({data.notes?.length || 0})
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {tab === 'overview' && (
            <>
              {/* Stage History */}
              <div className="tibbna-card">
                <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Stage History</h3></div>
                <div className="tibbna-card-content">
                  {(data.stageHistory || []).length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#a3a3a3' }}>No stage history</p>
                  ) : (
                    <div className="space-y-3">
                      {data.stageHistory.map((h: any, i: number) => (
                        <div key={i} className="flex items-start gap-3" style={{ padding: '6px 0', borderBottom: i < data.stageHistory.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#3B82F6', marginTop: 5 }} />
                          <div className="flex-1">
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>{h.stage_name || 'Stage'}</p>
                            <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                              {h.entered_at ? new Date(h.entered_at).toLocaleString() : ''} | {h.outcome || 'IN_PROGRESS'}
                            </p>
                            {h.notes && <p style={{ fontSize: '12px', color: '#525252', marginTop: 2 }}>{h.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Offer */}
              {data.offer && (
                <div className="tibbna-card">
                  <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Offer</h3></div>
                  <div className="tibbna-card-content space-y-2">
                    <InfoRow label="Offer #" value={data.offer.offer_number} />
                    <InfoRow label="Position" value={data.offer.position_title} />
                    <InfoRow label="Salary" value={data.offer.offered_salary ? `${parseFloat(data.offer.offered_salary).toLocaleString()} IQD` : '-'} />
                    <InfoRow label="Status" value={data.offer.status} />
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'interviews' && (
            <div className="space-y-3">
              {(data.interviews || []).length === 0 ? (
                <div className="tibbna-card"><div className="tibbna-card-content text-center py-8" style={{ color: '#a3a3a3' }}>No interviews scheduled</div></div>
              ) : data.interviews.map((iv: any) => (
                <div key={iv.interview_id} className="tibbna-card cursor-pointer hover:shadow-md" onClick={() => router.push(`/hr/recruitment/interviews/${iv.interview_id}`)}>
                  <div className="tibbna-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{iv.interview_type} Interview</p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                          {iv.scheduled_date ? new Date(iv.scheduled_date).toLocaleString() : '-'} | {iv.stage_name || ''}
                        </p>
                      </div>
                      <span className="tibbna-badge" style={{
                        backgroundColor: iv.status === 'COMPLETED' ? '#D1FAE5' : iv.status === 'CANCELLED' ? '#FEE2E2' : '#DBEAFE',
                        color: iv.status === 'COMPLETED' ? '#065F46' : iv.status === 'CANCELLED' ? '#991B1B' : '#1D4ED8'
                      }}>{iv.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'assessments' && (
            <div className="space-y-3">
              {(data.assessments || []).length === 0 ? (
                <div className="tibbna-card"><div className="tibbna-card-content text-center py-8" style={{ color: '#a3a3a3' }}>No assessments</div></div>
              ) : data.assessments.map((a: any) => (
                <div key={a.assessment_id || a.test_id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{a.test_name || 'Assessment'}</p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{a.test_type || ''} | Score: {a.score ?? '-'}/{a.max_score || 100}</p>
                      </div>
                      <span className="tibbna-badge" style={{
                        backgroundColor: a.passed ? '#D1FAE5' : a.passed === false ? '#FEE2E2' : '#F3F4F6',
                        color: a.passed ? '#065F46' : a.passed === false ? '#991B1B' : '#6B7280'
                      }}>{a.passed === true ? 'PASSED' : a.passed === false ? 'FAILED' : a.status || 'PENDING'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-3">
              {/* Add Note */}
              <div className="tibbna-card">
                <div className="tibbna-card-content space-y-3">
                  <textarea rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} className="tibbna-input" placeholder="Add a note..." style={{ resize: 'vertical', width: '100%' }} />
                  <button onClick={addNote} disabled={addingNote} className="btn-primary flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                    <Send size={14} /> Add Note
                  </button>
                </div>
              </div>
              {(data.notes || []).map((n: any, i: number) => (
                <div key={n.note_id || i} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                      {n.note_type || 'GENERAL'} | {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </p>
                    <p style={{ fontSize: '13px', marginTop: 4 }}>{n.note_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Contact Info</h3></div>
            <div className="tibbna-card-content space-y-2">
              <InfoRow label="Email" value={app.email || '-'} />
              <InfoRow label="Phone" value={app.phone || '-'} />
              <InfoRow label="Source" value={app.candidate_source || app.source || 'Direct'} />
              <InfoRow label="Experience" value={app.experience_years ? `${app.experience_years} years` : '-'} />
              <InfoRow label="Education" value={app.education || '-'} />
              <InfoRow label="Expected Salary" value={app.expected_salary ? `${parseFloat(app.expected_salary).toLocaleString()} IQD` : '-'} />
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Current Stage</h3></div>
            <div className="tibbna-card-content space-y-2">
              <InfoRow label="Stage" value={app.stage_name || '-'} />
              <InfoRow label="Type" value={app.stage_type || '-'} />
              <InfoRow label="Match Score" value={app.match_score || '-'} />
              <InfoRow label="Applied" value={app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '-'} />
            </div>
          </div>

          {/* Documents */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Documents ({(data.documents || []).length})</h3></div>
            <div className="tibbna-card-content">
              {(data.documents || []).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#a3a3a3' }}>No documents</p>
              ) : data.documents.map((d: any, i: number) => (
                <div key={i} style={{ fontSize: '13px', padding: '4px 0' }}>{d.document_name || d.document_type || 'Document'}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between" style={{ padding: '3px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: '12px', color: '#a3a3a3' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 500, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{value ?? '-'}</span>
    </div>
  );
}
