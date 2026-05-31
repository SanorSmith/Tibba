'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function EvaluateInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [interview, setInterview] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [form, setForm] = useState({
    overallRating: 5,
    recommendation: '',
    strengths: '',
    weaknesses: '',
    notes: '',
  });
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, [params.interviewId]);

  const fetchData = async () => {
    try {
      const [ivRes, critRes] = await Promise.all([
        fetch(`/api/recruitment/interviews/${params.interviewId}`),
        fetch(`/api/recruitment/evaluation-criteria?workspaceId=cec4d702-6dae-4ea5-9a30-ef17842c00fd`),
      ]);
      const ivData = await ivRes.json();
      const critData = await critRes.json();
      if (ivData.success) setInterview(ivData.data);
      if (critData.success) {
        setCriteria(critData.data || []);
        const initial: Record<string, number> = {};
        (critData.data || []).forEach((c: any) => { initial[c.criteria_id] = 5; });
        setCriteriaScores(initial);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!form.recommendation) { toast.error('Recommendation is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/recruitment/interviews/${params.interviewId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: params.interviewId,
          overallRating: form.overallRating,
          recommendation: form.recommendation,
          strengths: form.strengths,
          weaknesses: form.weaknesses,
          notes: form.notes,
          criteriaScores,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Evaluation submitted!');
        router.push(`/hr/recruitment/interviews/${params.interviewId}`);
      } else toast.error(data.error);
    } catch { toast.error('Failed to submit'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="page-title">Interview Evaluation</h2>
            <p className="page-description">
              {interview ? `${interview.candidate_first_name} ${interview.candidate_last_name} - ${interview.interview_type}` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Overall Rating</h3></div>
        <div className="tibbna-card-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input
              type="range" min="1" max="10" step="0.5"
              value={form.overallRating}
              onChange={(e) => setForm({ ...form, overallRating: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '24px', fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
              {form.overallRating}/10
            </span>
          </div>
        </div>
      </div>

      {/* Criteria Scores */}
      {criteria.length > 0 && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Evaluation Criteria</h3></div>
          <div className="tibbna-card-content space-y-4">
            {criteria.map((c: any) => (
              <div key={c.criteria_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: '13px', fontWeight: 500 }}>{c.criteria_name}</label>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{criteriaScores[c.criteria_id] || 5}/10</span>
                </div>
                {c.description && <p style={{ fontSize: '11px', color: '#a3a3a3', marginBottom: 4 }}>{c.description}</p>}
                <input
                  type="range" min="1" max="10" step="1"
                  value={criteriaScores[c.criteria_id] || 5}
                  onChange={(e) => setCriteriaScores({ ...criteriaScores, [c.criteria_id]: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Detailed Feedback</h3></div>
        <div className="tibbna-card-content space-y-4">
          <div>
            <label className="tibbna-label">Strengths</label>
            <textarea rows={3} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              className="tibbna-input" placeholder="What did the candidate do well?" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="tibbna-label">Areas for Improvement</label>
            <textarea rows={3} value={form.weaknesses} onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
              className="tibbna-input" placeholder="What could be improved?" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="tibbna-label">Additional Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="tibbna-input" placeholder="Additional observations..." style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Hiring Recommendation *</h3></div>
        <div className="tibbna-card-content">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { value: 'STRONG_HIRE', label: 'Strong Hire', color: '#065F46', bg: '#D1FAE5' },
              { value: 'HIRE', label: 'Hire', color: '#10B981', bg: '#ECFDF5' },
              { value: 'MAYBE', label: 'Maybe', color: '#92400E', bg: '#FEF3C7' },
              { value: 'NO_HIRE', label: 'No Hire', color: '#991B1B', bg: '#FEE2E2' },
              { value: 'STRONG_NO_HIRE', label: 'Strong No', color: '#7F1D1D', bg: '#FCA5A5' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, recommendation: opt.value })}
                style={{
                  padding: '8px 16px', borderRadius: 6, fontSize: '13px', fontWeight: 500,
                  border: form.recommendation === opt.value ? `2px solid ${opt.color}` : '1px solid #e4e4e4',
                  backgroundColor: form.recommendation === opt.value ? opt.bg : '#fff',
                  color: form.recommendation === opt.value ? opt.color : '#525252',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 tibbna-section" style={{ paddingBottom: 32 }}>
        <button onClick={() => router.back()} className="btn-secondary" disabled={saving}>Cancel</button>
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2" disabled={saving}>
          <Save size={16} /> Submit Evaluation
        </button>
      </div>
    </>
  );
}
