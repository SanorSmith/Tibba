'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, UserPlus, Users, CheckCircle, XCircle, Search, ChevronRight, BarChart3 } from 'lucide-react';

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
  const [summary, setSummary] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const fetchRecruitmentData = async () => {
    try {
      setLoading(true);
      
      // Fetch summary data
      const summaryResponse = await fetch('/api/hr/recruitment');
      const summaryData = await summaryResponse.json();
      
      if (summaryData.success) {
        setSummary(summaryData.data.summary);
      }
      
      // Fetch vacancies
      const vacanciesResponse = await fetch('/api/hr/recruitment?type=vacancies');
      const vacanciesData = await vacanciesResponse.json();
      
      if (vacanciesData.success) {
        setVacancies(vacanciesData.data);
      }
      
      // Fetch candidates
      const candidatesResponse = await fetch('/api/hr/recruitment?type=candidates');
      const candidatesData = await candidatesResponse.json();
      
      if (candidatesData.success) {
        setCandidates(candidatesData.data);
      }
      
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Recruitment & Hiring</h2>
          <p className="page-description">Job vacancies, candidates, and hiring pipeline</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/recruitment/applicants">
            <button className="btn-primary flex items-center gap-2"><Users size={16} /><span className="hidden sm:inline">Applicant Management</span></button>
          </Link>
          <Link href="/hr/recruitment/vacancies/create">
            <button className="btn-secondary flex items-center gap-2"><Briefcase size={16} /><span className="hidden sm:inline">Create Vacancy</span></button>
          </Link>
          <Link href="/hr/recruitment/analytics">
            <button className="btn-secondary flex items-center gap-2"><BarChart3 size={16} /><span className="hidden sm:inline">Analytics</span></button>
          </Link>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        {loading ? (
          <div className="col-span-4 text-center py-8">
            <p>Loading recruitment data...</p>
          </div>
        ) : summary ? (
          <>
            <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Open Vacancies</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{summary.open_vacancies}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><Briefcase size={20} style={{ color: '#10B981' }} /></div></div></div></div>
            <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Candidates</p><p className="tibbna-card-value">{summary.total_candidates}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Users size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
            <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Time to Hire</p><p className="tibbna-card-value">{summary.avg_time_to_hire_days}d</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Search size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
            <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Offer Acceptance</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{summary.offer_acceptance_rate}%</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><CheckCircle size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
          </>
        ) : (
          <div className="col-span-4 text-center py-8">
            <p>No recruitment data available</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        <button onClick={() => setTab('vacancies')} className={`tibbna-tab ${tab === 'vacancies' ? 'tibbna-tab-active' : ''}`}>Vacancies</button>
        <button onClick={() => setTab('candidates')} className={`tibbna-tab ${tab === 'candidates' ? 'tibbna-tab-active' : ''}`}>Candidates</button>
        <Link href="/hr/recruitment/applicants">
          <button className="tibbna-tab">Applicant Management</button>
        </Link>
        <Link href="/hr/recruitment/analytics">
          <button className="tibbna-tab">Analytics</button>
        </Link>
      </div>

      {tab === 'vacancies' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading vacancies...</p>
            </div>
          ) : vacancies.length > 0 ? (
            vacancies.map((v: any) => {
              const sc = vacancyStatusColors[v.status] || { bg: '#F3F4F6', text: '#374151' };
              const applicants = candidates.filter((c: any) => c.vacancy_id === v.id).length;
              return (
                <Link key={v.id} href={`/hr/recruitment/vacancies/${v.id}`}>
                  <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow">
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
                          <ChevronRight size={16} style={{ color: '#a3a3a3' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p>No vacancies found</p>
            </div>
          )}
        </div>
      )}

      {tab === 'candidates' && (
        <>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading candidates...</p>
            </div>
          ) : candidates.length > 0 ? (
            <>
              <div className="tibbna-card hidden md:block">
                <div className="tibbna-table-container">
                  <table className="tibbna-table">
                    <thead><tr><th>Candidate</th><th>Position</th><th>Education</th><th>Experience</th><th>Expected Salary</th><th>Source</th><th>Status</th></tr></thead>
                    <tbody>
                      {candidates.map((c: any) => {
                        const sc = statusColors[c.status] || { bg: '#F3F4F6', text: '#374151' };
                        return (
                          <tr key={c.id} onClick={() => window.location.href = `/hr/recruitment/candidates/${c.id}`} className="cursor-pointer hover:bg-gray-50">
                            <td><p style={{ fontSize: '14px', fontWeight: 500 }}>{c.first_name} {c.last_name}</p><p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.email}</p></td>
                            <td style={{ fontSize: '13px' }}>{c.vacancy_position || '-'}</td>
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
                {candidates.map((c: any) => {
                  const sc = statusColors[c.status] || { bg: '#F3F4F6', text: '#374151' };
                  return (
                    <Link key={c.id} href={`/hr/recruitment/candidates/${c.id}`}>
                      <div className="tibbna-card cursor-pointer active:bg-gray-50">
                        <div className="tibbna-card-content">
                          <div className="flex justify-between mb-1">
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{c.first_name} {c.last_name}</span>
                            <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{c.status}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#525252' }}>{c.vacancy_position} | {c.experience_years}y exp</p>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.source} | Expected: {(c.expected_salary / 1000000).toFixed(1)}M IQD</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p>No candidates found</p>
            </div>
          )}
        </>
      )}

      {/* Pipeline Summary */}
      {summary && (
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Recruitment Pipeline</h3></div>
          <div className="tibbna-card-content">
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary.by_status).map(([status, count]) => {
                const sc = statusColors[status] || { bg: '#F3F4F6', text: '#374151' };
                return (
                  <div key={status} className="flex items-center gap-2" style={{ padding: '8px 16px', border: '1px solid #e4e4e4' }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.text }} />
                    <span style={{ fontSize: '13px' }}>{status}: <strong>{count as number}</strong></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
