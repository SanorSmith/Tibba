'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Briefcase, GraduationCap, Star, CheckCircle, XCircle, Send, FileText } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';

export default function CandidateDetailPage() {
  const params = useParams();
  const [candidate, setCandidate] = useState<any>(null);
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  useEffect(() => {
    fetchCandidateData();
  }, [params.id]);

  const fetchCandidateData = async () => {
    try {
      setLoading(true);
      
      // Fetch candidate
      const candidatesResponse = await fetch('/api/hr/recruitment?type=candidates');
      const candidatesData = await candidatesResponse.json();
      
      if (candidatesData.success) {
        const foundCandidate = candidatesData.data.find((c: any) => c.id === params.id);
        setCandidate(foundCandidate);
        setStatus(foundCandidate?.status || '');
        setNotes(foundCandidate?.notes || '');
        
        // Fetch vacancy details
        if (foundCandidate?.vacancy_id) {
          const vacanciesResponse = await fetch('/api/hr/recruitment?type=vacancies');
          const vacanciesData = await vacanciesResponse.json();
          
          if (vacanciesData.success) {
            const foundVacancy = vacanciesData.data.find((v: any) => v.id === foundCandidate.vacancy_id);
            setVacancy(foundVacancy);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching candidate data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Candidate Not Found</h2>
        <Link href="/hr/recruitment"><button className="btn-primary">Back to Recruitment</button></Link>
      </div>
    );
  }

  const pipelineSteps = [
    { label: 'Applied', status: ['NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED'].includes(status) ? 'APPROVED' as const : 'NOT_STARTED' as const },
    { label: 'Screening', status: ['SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED'].includes(status) ? 'APPROVED' as const : status === 'REJECTED' ? 'REJECTED' as const : 'NOT_STARTED' as const },
    { label: 'Interview', status: ['INTERVIEWING', 'OFFERED', 'HIRED'].includes(status) ? 'APPROVED' as const : 'NOT_STARTED' as const },
    { label: 'Offer', status: ['OFFERED', 'HIRED'].includes(status) ? 'APPROVED' as const : 'NOT_STARTED' as const },
    { label: 'Hired', status: status === 'HIRED' ? 'APPROVED' as const : 'NOT_STARTED' as const },
  ];

  const updateCandidateStatus = async (newStatus: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/hr/recruitment/candidates/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          rejection_reason: rejectionReason,
          notes: notes
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus(newStatus);
        setCandidate(prev => ({ ...prev, ...result.data }));
        if (newStatus === 'HIRED') {
          alert('Candidate has been hired! 🎉');
        }
      } else {
        alert('Error updating status: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating status');
    }
  };

  const advanceStatus = () => {
    const order = ['NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED'];
    const idx = order.indexOf(status);
    if (idx < order.length - 1) {
      updateCandidateStatus(order[idx + 1]);
    }
  };

  const rejectCandidate = () => {
    if (rejectionReason.trim()) {
      updateCandidateStatus('REJECTED', rejectionReason);
      setShowRejectionDialog(false);
    } else {
      alert('Please provide a rejection reason');
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">{candidate.first_name} {candidate.last_name}</h2>
            <p className="page-description">Candidate Profile</p>
          </div>
        </div>
        <div className="flex gap-2">
          {status !== 'HIRED' && status !== 'REJECTED' && (
            <>
              <button className="btn-secondary" style={{ color: '#EF4444' }} onClick={() => setStatus('REJECTED')}>Reject</button>
              <button className="btn-primary" onClick={advanceStatus}>Advance to Next Stage</button>
            </>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Hiring Pipeline</h3></div>
        <div className="tibbna-card-content">
          <ApprovalWorkflow steps={pipelineSteps} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="lg:col-span-2 space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Personal Information</h3></div>
            <div className="tibbna-card-content">
              <div className="flex items-start gap-4 mb-4">
                <EmployeeAvatar name={`${candidate.first_name} ${candidate.last_name}`} size="lg" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{candidate.first_name} {candidate.last_name}</h3>
                  <SmartStatusBadge status={status} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
                <div className="flex items-center gap-2"><Mail size={14} style={{ color: '#a3a3a3' }} /><span>{candidate.email}</span></div>
                <div className="flex items-center gap-2"><Phone size={14} style={{ color: '#a3a3a3' }} /><span>{candidate.phone}</span></div>
                <div className="flex items-center gap-2"><GraduationCap size={14} style={{ color: '#a3a3a3' }} /><span>{candidate.education}</span></div>
                <div className="flex items-center gap-2"><Briefcase size={14} style={{ color: '#a3a3a3' }} /><span>{candidate.experience_years} years experience</span></div>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Application Details</h3></div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Applied For</span><p style={{ fontWeight: 500 }}>{vacancy?.position || 'N/A'}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Department</span><p style={{ fontWeight: 500 }}>{vacancy?.department || 'N/A'}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Applied Date</span><p style={{ fontWeight: 500 }}>{candidate.applied_date}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Source</span><p style={{ fontWeight: 500 }}>{candidate.source}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Expected Salary</span><p style={{ fontWeight: 500 }}>{(candidate.expected_salary / 1000000).toFixed(1)}M IQD</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Current Employer</span><p style={{ fontWeight: 500 }}>{(candidate as any).current_employer || 'N/A'}</p></div>
              </div>
            </div>
          </div>

          {(candidate as any).notes && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Notes</h3></div>
              <div className="tibbna-card-content">
                <p style={{ fontSize: '13px', color: '#525252' }}>{(candidate as any).notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Evaluation</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#a3a3a3' }}>Screening Score</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1" style={{ height: '8px', backgroundColor: '#f3f4f6' }}>
                    <div style={{ width: `${((candidate as any).screening_score || 75)}%`, height: '100%', backgroundColor: '#618FF5' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{(candidate as any).screening_score || 75}%</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#a3a3a3' }}>Interview Score</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1" style={{ height: '8px', backgroundColor: '#f3f4f6' }}>
                    <div style={{ width: `${((candidate as any).interview_score || 0)}%`, height: '100%', backgroundColor: '#10B981' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{(candidate as any).interview_score || '-'}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Vacancy Info</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              {vacancy && (
                <>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Position</span><span style={{ fontWeight: 500 }}>{vacancy.position}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Department</span><span style={{ fontWeight: 500 }}>{vacancy.department}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Salary Range</span><span style={{ fontWeight: 500 }}>{(vacancy.salary_min / 1000000).toFixed(1)}-{(vacancy.salary_max / 1000000).toFixed(1)}M</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Deadline</span><span style={{ fontWeight: 500 }}>{vacancy.deadline}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
