'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { Employee, PerformanceReview } from '@/types/hr';
import performanceData from '@/data/hr/performance.json';

const competencies = [
  { id: 'clinical', name: 'Clinical Skills', description: 'Technical and clinical competence', field: 'clinical_competence' },
  { id: 'patient_care', name: 'Patient Care', description: 'Patient interaction and empathy', field: 'patient_care' },
  { id: 'professionalism', name: 'Professionalism', description: 'Professional conduct and ethics', field: 'professionalism' },
  { id: 'teamwork', name: 'Teamwork', description: 'Collaboration and team contribution', field: 'teamwork' },
  { id: 'quality_safety', name: 'Quality & Safety', description: 'Quality improvement and patient safety', field: 'quality_safety' },
];

export default function CreatePerformanceReviewPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const cycles = performanceData.cycles;

  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState(cycles[0]?.id || '');
  const [reviewType, setReviewType] = useState('MANAGER');
  const [reviewer, setReviewer] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(competencies.map(c => [c.id, 3]))
  );
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovement] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setEmployees(dataStore.getEmployees().filter(e => e.employment_status === 'ACTIVE'));
  }, []);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const overallRating = competencies.length > 0
    ? Math.round((Object.values(ratings).reduce((s, r) => s + r, 0) / competencies.length) * 10) / 10
    : 0;

  const handleSubmit = useCallback(() => {
    if (!employeeId || !cycleId || !reviewer.trim()) { toast.error('Fill required fields'); return; }
    setProcessing(true);
    const emp = employees.find(e => e.id === employeeId);
    const existingReviews = dataStore.getPerformanceReviews();
    const newId = `PR-${String(existingReviews.length + 1).padStart(3, '0')}`;

    const review: PerformanceReview = {
      id: newId,
      employee_id: employeeId,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
      department: emp?.department_name,
      cycle_id: cycleId,
      reviewer: reviewer.trim(),
      review_type: reviewType as PerformanceReview['review_type'],
      overall_rating: overallRating,
      clinical_competence: ratings.clinical,
      patient_care: ratings.patient_care,
      professionalism: ratings.professionalism,
      teamwork: ratings.teamwork,
      quality_safety: ratings.quality_safety,
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString().split('T')[0],
      strengths: strengths.trim() || undefined,
      improvements: improvements.trim() || undefined,
      recommendation: recommendation.trim() || undefined,
    };

    const ok = dataStore.addPerformanceReview(review);
    if (ok) { toast.success('Review submitted successfully'); setSubmitted(true); }
    else toast.error('Failed to save review');
    setProcessing(false);
  }, [employeeId, cycleId, reviewer, employees, overallRating, ratings, reviewType, strengths, improvements, recommendation]);

  const resetForm = useCallback(() => {
    setSubmitted(false); setEmployeeId(''); setReviewer('');
    setRatings(Object.fromEntries(competencies.map(c => [c.id, 3])));
    setStrengths(''); setImprovement(''); setRecommendation('');
  }, []);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <CheckCircle size={32} style={{ color: '#10B981' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Review Submitted Successfully</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>{selectedEmployee?.first_name} {selectedEmployee?.last_name} — Overall: {overallRating}/5</p>
        <div className="flex gap-2">
          <Link href="/hr/performance"><button className="btn-secondary">Back to Performance</button></Link>
          <button className="btn-primary" onClick={resetForm}>Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/performance"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Create Performance Review</h2>
            <p className="page-description">Evaluate employee performance across competencies</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Employee & Cycle Selection */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Review Setup</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Employee *</label>
                  <select className="tibbna-input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                    <option value="">Select employee...</option>
                    {employees.map(e => (<option key={e.id} value={e.id}>{e.first_name} {e.last_name} - {e.department_name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Reviewer Name *</label>
                  <input className="tibbna-input" value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Manager / reviewer name" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Review Cycle *</label>
                  <select className="tibbna-input" value={cycleId} onChange={e => setCycleId(e.target.value)}>
                    {cycles.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Review Type</label>
                  <select className="tibbna-input" value={reviewType} onChange={e => setReviewType(e.target.value)}>
                    <option value="SELF">Self Assessment</option>
                    <option value="MANAGER">Manager Review</option>
                    <option value="360">360° Review</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Competency Ratings */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Competency Ratings</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {competencies.map(comp => (
                <div key={comp.id}>
                  <div className="flex justify-between mb-1">
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{comp.name}</span>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{comp.description}</p>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: ratings[comp.id] >= 4 ? '#10B981' : ratings[comp.id] >= 3 ? '#F59E0B' : '#EF4444' }}>
                      {ratings[comp.id]}/5
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setRatings(prev => ({ ...prev, [comp.id]: star }))} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                        <Star size={20} fill={star <= ratings[comp.id] ? '#F59E0B' : 'none'} style={{ color: star <= ratings[comp.id] ? '#F59E0B' : '#d4d4d4' }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Comments & Recommendation</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Key Strengths</label>
                <textarea className="tibbna-input" rows={3} value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="Highlight employee's key strengths..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Areas for Improvement</label>
                <textarea className="tibbna-input" rows={3} value={improvements} onChange={e => setImprovement(e.target.value)} placeholder="Areas where the employee can improve..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Recommendation</label>
                <input className="tibbna-input" value={recommendation} onChange={e => setRecommendation(e.target.value)} placeholder="e.g. Merit increase, Standard increase, Performance improvement plan" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e4e4e4', paddingTop: '16px' }}>
                <Link href="/hr/performance"><button className="btn-secondary">Cancel</button></Link>
                <button className="btn-primary" onClick={handleSubmit} disabled={!employeeId || !cycleId || !reviewer.trim() || processing}>{processing ? 'Submitting…' : 'Submit Review'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedEmployee && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee</h3></div>
              <div className="tibbna-card-content">
                <div className="flex items-center gap-3 mb-3">
                  <EmployeeAvatar name={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} size="lg" />
                  <div>
                    <Link href={`/hr/employees/${selectedEmployee.id}`} style={{ fontSize: '15px', fontWeight: 600, color: '#618FF5' }} className="hover:underline">{selectedEmployee.first_name} {selectedEmployee.last_name}</Link>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{selectedEmployee.job_title}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{selectedEmployee.department_name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Rating Summary</h3></div>
            <div className="tibbna-card-content" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '48px', fontWeight: 700, color: overallRating >= 4 ? '#10B981' : overallRating >= 3 ? '#F59E0B' : '#EF4444' }}>{overallRating}</p>
              <p style={{ fontSize: '14px', color: '#525252' }}>Overall Rating / 5</p>
              <div className="flex justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={20} fill={s <= Math.round(overallRating) ? '#F59E0B' : 'none'} style={{ color: s <= Math.round(overallRating) ? '#F59E0B' : '#d4d4d4' }} />
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '8px' }}>
                {overallRating >= 4.5 ? 'Outstanding' : overallRating >= 3.5 ? 'Exceeds Expectations' : overallRating >= 2.5 ? 'Meets Expectations' : overallRating >= 1.5 ? 'Needs Improvement' : 'Unsatisfactory'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
