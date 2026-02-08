'use client';

import { useState } from 'react';
import { Briefcase, UserPlus, Users, CheckCircle, XCircle, Search } from 'lucide-react';
import candidatesData from '@/data/hr/candidates.json';

const statusColors: Record<string, { bg: string; text: string }> = {
  NEW: { bg: '#DBEAFE', text: '#1D4ED8' },
  SCREENING: { bg: '#E0E7FF', text: '#4338CA' },
  INTERVIEWING: { bg: '#FEF3C7', text: '#92400E' },
  OFFERED: { bg: '#D1FAE5', text: '#065F46' },
  HIRED: { bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
};

const vacancyStatusColors: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: '#D1FAE5', text: '#065F46' },
  CLOSED: { bg: '#F3F4F6', text: '#6B7280' },
  FILLED: { bg: '#DBEAFE', text: '#1D4ED8' },
};

export default function RecruitmentPage() {
  const [tab, setTab] = useState<'vacancies' | 'candidates'>('vacancies');
  const summary = candidatesData.recruitment_summary;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Recruitment & Hiring</h2>
          <p className="page-description">Job vacancies, candidates, and hiring pipeline</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Briefcase size={16} /><span className="hidden sm:inline">Post Vacancy</span></button>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Open Vacancies</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{summary.open_vacancies}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><Briefcase size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Candidates</p><p className="tibbna-card-value">{summary.total_candidates}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Users size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Time to Hire</p><p className="tibbna-card-value">{summary.avg_time_to_hire_days}d</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Search size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Offer Acceptance</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{summary.offer_acceptance_rate}%</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><CheckCircle size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <button onClick={() => setTab('vacancies')} className={`tibbna-tab ${tab === 'vacancies' ? 'tibbna-tab-active' : ''}`}>Vacancies</button>
        <button onClick={() => setTab('candidates')} className={`tibbna-tab ${tab === 'candidates' ? 'tibbna-tab-active' : ''}`}>Candidates</button>
      </div>

      {tab === 'vacancies' && (
        <div className="space-y-3">
          {candidatesData.vacancies.map(v => {
            const sc = vacancyStatusColors[v.status] || { bg: '#F3F4F6', text: '#374151' };
            const applicants = candidatesData.candidates.filter(c => c.vacancy_id === v.id).length;
            return (
              <div key={v.id} className="tibbna-card">
                <div className="tibbna-card-content">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{v.position}</h4>
                        <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{v.status}</span>
                        {v.priority === 'URGENT' && <span className="tibbna-badge badge-error">URGENT</span>}
                        {v.priority === 'HIGH' && <span className="tibbna-badge badge-warning">HIGH</span>}
                      </div>
                      <p style={{ fontSize: '13px', color: '#525252' }}>{v.department} | {v.openings} opening(s) | Grade: {v.grade}</p>
                      <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Posted: {v.posting_date} | Deadline: {v.deadline}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 700 }}>{applicants}</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Applicants</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500 }}>{(v.salary_min / 1000000).toFixed(1)}-{(v.salary_max / 1000000).toFixed(1)}M</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>IQD/month</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'candidates' && (
        <>
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-table-container">
              <table className="tibbna-table">
                <thead><tr><th>Candidate</th><th>Position</th><th>Education</th><th>Experience</th><th>Expected Salary</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {candidatesData.candidates.map(c => {
                    const sc = statusColors[c.status] || { bg: '#F3F4F6', text: '#374151' };
                    const vacancy = candidatesData.vacancies.find(v => v.id === c.vacancy_id);
                    return (
                      <tr key={c.id}>
                        <td><p style={{ fontSize: '14px', fontWeight: 500 }}>{c.first_name} {c.last_name}</p><p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.email}</p></td>
                        <td style={{ fontSize: '13px' }}>{vacancy?.position || '-'}</td>
                        <td style={{ fontSize: '13px' }}>{c.education}</td>
                        <td style={{ fontSize: '13px' }}>{c.experience_years}y</td>
                        <td style={{ fontSize: '13px' }}>{(c.expected_salary / 1000000).toFixed(1)}M</td>
                        <td><span className="tibbna-badge badge-info" style={{ fontSize: '10px' }}>{c.source}</span></td>
                        <td><span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{c.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-2">
            {candidatesData.candidates.map(c => {
              const sc = statusColors[c.status] || { bg: '#F3F4F6', text: '#374151' };
              const vacancy = candidatesData.vacancies.find(v => v.id === c.vacancy_id);
              return (
                <div key={c.id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{c.first_name} {c.last_name}</span>
                      <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{c.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{vacancy?.position} | {c.experience_years}y exp</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.source} | Expected: {(c.expected_salary / 1000000).toFixed(1)}M IQD</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pipeline Summary */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Recruitment Pipeline</h3></div>
        <div className="tibbna-card-content">
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.by_status).map(([status, count]) => {
              const sc = statusColors[status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <div key={status} className="flex items-center gap-2" style={{ padding: '8px 16px', border: '1px solid #e4e4e4' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.text }} />
                  <span style={{ fontSize: '13px' }}>{status}: <strong>{count}</strong></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
