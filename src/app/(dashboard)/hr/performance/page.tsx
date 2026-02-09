'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Award, TrendingUp, AlertTriangle, Users, Plus, Target } from 'lucide-react';
import performanceData from '@/data/hr/performance.json';

const ratingColor = (r: number) => r >= 4 ? '#10B981' : r >= 3 ? '#F59E0B' : '#EF4444';

export default function PerformancePage() {
  const [tab, setTab] = useState<'reviews' | 'recognitions'>('reviews');
  const dist = performanceData.rating_distribution;
  const reviews = performanceData.reviews;
  const recognitions = performanceData.recognitions;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Performance Management</h2>
          <p className="page-description">Reviews, goals, and employee recognition</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/performance/goals">
            <button className="btn-secondary flex items-center gap-2"><Target size={16} /><span className="hidden sm:inline">Goals</span></button>
          </Link>
          <Link href="/hr/performance/reviews/new">
            <button className="btn-primary flex items-center gap-2"><Plus size={16} /><span className="hidden sm:inline">New Review</span></button>
          </Link>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Rating</p><p className="tibbna-card-value" style={{ color: ratingColor(dist.avg_rating) }}>{dist.avg_rating}/5</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Star size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Reviews Done</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{dist.completed}/{dist.total_reviews}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><TrendingUp size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">In Progress</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{dist.in_progress}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><AlertTriangle size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Recognitions</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{recognitions.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><Award size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Rating Distribution */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Rating Distribution - {performanceData.cycles[0].name}</h3></div>
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

      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <button onClick={() => setTab('reviews')} className={`tibbna-tab ${tab === 'reviews' ? 'tibbna-tab-active' : ''}`}>Reviews</button>
        <button onClick={() => setTab('recognitions')} className={`tibbna-tab ${tab === 'recognitions' ? 'tibbna-tab-active' : ''}`}>Recognitions</button>
      </div>

      {tab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{r.employee_name}</h4>
                      <span className="tibbna-badge" style={{
                        backgroundColor: r.status === 'FINALIZED' ? '#D1FAE5' : r.status === 'SUBMITTED' ? '#FEF3C7' : '#DBEAFE',
                        color: r.status === 'FINALIZED' ? '#065F46' : r.status === 'SUBMITTED' ? '#92400E' : '#1D4ED8'
                      }}>{r.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>Reviewer: {r.reviewer}</p>
                    {r.strengths && <p style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}><strong>Strengths:</strong> {r.strengths.substring(0, 80)}...</p>}
                    {r.recommendation && <p style={{ fontSize: '12px', color: '#6366F1', marginTop: '2px' }}>{r.recommendation}</p>}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: ratingColor(r.overall_rating) }}>{r.overall_rating}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>out of 5</p>
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
          ))}
        </div>
      )}

      {tab === 'recognitions' && (
        <div className="space-y-3">
          {recognitions.map(rec => (
            <div key={rec.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                    <Award size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{rec.title}</h4>
                      <span className="tibbna-badge badge-warning">{rec.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{rec.employee_name}</p>
                    <p style={{ fontSize: '13px', color: '#525252', marginTop: '4px' }}>{rec.reason}</p>
                    <div className="flex items-center gap-4 mt-2" style={{ fontSize: '12px', color: '#a3a3a3' }}>
                      <span>By: {rec.recognized_by}</span>
                      <span>{rec.date}</span>
                      {rec.monetary_reward > 0 && <span style={{ color: '#10B981', fontWeight: 600 }}>{(rec.monetary_reward / 1000).toFixed(0)}K IQD</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
