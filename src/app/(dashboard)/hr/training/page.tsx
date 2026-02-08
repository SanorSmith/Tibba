'use client';

import { useState } from 'react';
import { GraduationCap, Award, AlertTriangle, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import trainingData from '@/data/hr/training.json';

const statusColors: Record<string, { bg: string; text: string }> = {
  CURRENT: { bg: '#D1FAE5', text: '#065F46' },
  EXPIRING_SOON: { bg: '#FEF3C7', text: '#92400E' },
  EXPIRED: { bg: '#FEE2E2', text: '#991B1B' },
  SCHEDULED: { bg: '#DBEAFE', text: '#1D4ED8' },
  COMPLETED: { bg: '#D1FAE5', text: '#065F46' },
};

export default function TrainingPage() {
  const [tab, setTab] = useState<'programs' | 'sessions' | 'records'>('programs');
  const summary = trainingData.training_summary;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Training & Development</h2>
          <p className="page-description">Programs, certifications, and CME tracking</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><GraduationCap size={16} /><span className="hidden sm:inline">New Program</span></button>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Active Programs</p><p className="tibbna-card-value">{summary.total_programs}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><BookOpen size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Compliance Rate</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{summary.compliance_rate}%</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Expiring Certs</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{summary.expiring_certifications}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><AlertTriangle size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">CME Credits YTD</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{summary.total_cme_credits_awarded}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><Award size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      <div className="flex gap-2 tibbna-section flex-wrap" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <button onClick={() => setTab('programs')} className={`tibbna-tab ${tab === 'programs' ? 'tibbna-tab-active' : ''}`}>Programs</button>
        <button onClick={() => setTab('sessions')} className={`tibbna-tab ${tab === 'sessions' ? 'tibbna-tab-active' : ''}`}>Sessions</button>
        <button onClick={() => setTab('records')} className={`tibbna-tab ${tab === 'records' ? 'tibbna-tab-active' : ''}`}>Employee Records</button>
      </div>

      {tab === 'programs' && (
        <div className="tibbna-grid-2">
          {trainingData.programs.map(p => (
            <div key={p.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-start justify-between mb-2">
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</h4>
                  <span className="tibbna-badge" style={{ backgroundColor: p.category === 'MANDATORY' ? '#FEE2E2' : '#D1FAE5', color: p.category === 'MANDATORY' ? '#991B1B' : '#065F46', fontSize: '10px' }}>{p.category}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#525252', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>Type: {p.type.replace(/_/g, ' ')}</span>
                  <span>Duration: {p.duration_hours} hours | Delivery: {p.delivery}</span>
                  {p.cme_credits > 0 && <span style={{ color: '#6366F1' }}>CME Credits: {p.cme_credits}</span>}
                  {p.validity_months > 0 && <span>Valid for: {p.validity_months} months</span>}
                  <span>Max Participants: {p.max_participants}</span>
                  {p.cost_per_participant > 0 && <span>Cost: {(p.cost_per_participant / 1000).toFixed(0)}K IQD/person</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {trainingData.sessions.map(s => {
            const sc = statusColors[s.status] || { bg: '#F3F4F6', text: '#374151' };
            return (
              <div key={s.id} className="tibbna-card">
                <div className="tibbna-card-content">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{s.program_name}</h4>
                        <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{s.status}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#525252' }}>{s.session_number} | {s.location}</p>
                      <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{s.start_date} {s.start_time}-{s.end_time} | Trainer: {s.trainer}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 700 }}>{s.enrolled}/{s.max_participants}</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Enrolled</p>
                      </div>
                      {s.attended > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>{s.attended}</p>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Attended</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'records' && (
        <>
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead><tr><th>Employee</th><th>Program</th><th>Completed</th><th>Certificate</th><th>CME</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {trainingData.employee_training_records.map(r => {
                    const sc = statusColors[r.status] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{r.employee_name}</td>
                        <td style={{ fontSize: '13px' }}>{r.program_name}</td>
                        <td style={{ fontSize: '13px' }}>{r.completion_date}</td>
                        <td style={{ fontSize: '12px', color: '#525252' }}>{r.certificate_number}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{r.cme_credits}</td>
                        <td style={{ fontSize: '13px' }}>{r.expiry_date || 'N/A'}</td>
                        <td><span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{r.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-2">
            {trainingData.employee_training_records.map(r => {
              const sc = statusColors[r.status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <div key={r.id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.employee_name}</span>
                      <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{r.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{r.program_name} | CME: {r.cme_credits}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Completed: {r.completion_date} | Expires: {r.expiry_date || 'N/A'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
