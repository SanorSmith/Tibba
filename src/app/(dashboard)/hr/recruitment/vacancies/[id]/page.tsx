'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, DollarSign, Users, Clock, Briefcase } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';

export default function VacancyDetailPage() {
  const params = useParams();
  const [vacancy, setVacancy] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVacancyData();
  }, [params.id]);

  const fetchVacancyData = async () => {
    try {
      console.log('🔍 Starting fetchVacancyData...');
      console.log('📋 params.id:', params.id);
      
      setLoading(true);
      
      // Fetch vacancy details
      console.log('📡 Fetching vacancies...');
      const vacancyResponse = await fetch('/api/hr/recruitment?type=vacancies');
      const vacancyData = await vacancyResponse.json();
      
      console.log('📊 Vacancy response:', vacancyData);
      
      if (vacancyData.success) {
        console.log('🔍 Looking for vacancy with ID:', params.id);
        console.log('📋 Available vacancy IDs:', vacancyData.data.map((v: any) => v.id));
        console.log('📋 Available vacancy numbers:', vacancyData.data.map((v: any) => v.vacancy_number));
        console.log('📋 Full vacancy data structure:', vacancyData.data[0]);
        
        const foundVacancy = vacancyData.data.find((v: any) => v.id === params.id);
        console.log('✅ Found vacancy by UUID:', foundVacancy);
        
        // If not found by UUID, try by vacancy_number
        if (!foundVacancy) {
          const foundByNumber = vacancyData.data.find((v: any) => v.vacancy_number === params.id);
          console.log('🔍 Trying to find by vacancy_number:', params.id);
          console.log('✅ Found vacancy by number:', foundByNumber);
          setVacancy(foundByNumber);
        } else {
          console.log('✅ Found vacancy by UUID:', foundVacancy);
          setVacancy(foundVacancy);
        }
      }
      
      // Fetch candidates for this vacancy
      console.log('📡 Fetching candidates...');
      const candidatesResponse = await fetch('/api/hr/recruitment?type=candidates');
      const candidatesData = await candidatesResponse.json();
      
      console.log('📊 Candidates response:', candidatesData);
      
      if (candidatesData.success) {
        const vacancyCandidates = candidatesData.data.filter((c: any) => c.vacancy_id === params.id);
        console.log('👥 Vacancy candidates:', vacancyCandidates);
        setCandidates(vacancyCandidates);
      }
      
    } catch (error) {
      console.error('❌ Error fetching vacancy data:', error);
    } finally {
      setLoading(false);
      console.log('✅ fetchVacancyData completed');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p>Loading vacancy details...</p>
      </div>
    );
  }

  console.log('🔍 Render state check:');
  console.log('📋 loading:', loading);
  console.log('📋 vacancy:', vacancy);
  console.log('📋 params.id:', params.id);

  if (!vacancy) {
    console.log('❌ Vacancy not found - showing error page');
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Vacancy Not Found</h2>
        <p style={{ fontSize: '14px', color: '#666' }}>ID: {params.id}</p>
        <p style={{ fontSize: '12px', color: '#999' }}>This vacancy may have been closed or does not exist.</p>
        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', maxWidth: '400px' }}>
          <p>Available vacancies:</p>
          <p>VAC-2026-001 (Emergency Physician)</p>
          <p>VAC-2026-002 (Staff Nurse - ICU)</p>
          <p>VAC-2026-003 (Lab Technician)</p>
        </div>
        <Link href="/hr/recruitment/vacancies"><button className="btn-primary">Back to Vacancies</button></Link>
      </div>
    );
  }

  console.log('✅ Rendering vacancy details for:', vacancy.position);

  const pipeline = {
    NEW: candidates.filter(c => c.status === 'NEW').length,
    SCREENING: candidates.filter(c => c.status === 'SCREENING').length,
    INTERVIEWING: candidates.filter(c => c.status === 'INTERVIEWING').length,
    OFFERED: candidates.filter(c => c.status === 'OFFERED').length,
    HIRED: candidates.filter(c => c.status === 'HIRED').length,
    REJECTED: candidates.filter(c => c.status === 'REJECTED').length,
  };

  const pipelineColors: Record<string, string> = {
    NEW: '#6B7280', SCREENING: '#3B82F6', INTERVIEWING: '#F59E0B', OFFERED: '#8B5CF6', HIRED: '#10B981', REJECTED: '#EF4444'
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment/vacancies"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">{vacancy.position}</h2>
            <p className="page-description">{vacancy.department}</p>
          </div>
        </div>
        <SmartStatusBadge status={vacancy.status} />
      </div>

      {/* Pipeline */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Hiring Pipeline</h3></div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(pipeline).map(([stage, count]) => (
              <div key={stage} style={{ textAlign: 'center', padding: '12px 4px', border: '1px solid #e4e4e4' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: pipelineColors[stage] }}>{count}</p>
                <p style={{ fontSize: '10px', color: '#525252' }}>{stage}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Applicants */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Applicants ({candidates.length})</h3></div>
            <div className="tibbna-card-content">
              {candidates.length > 0 ? (
                <div className="space-y-2">
                  {candidates.map((c: any) => (
                    <Link key={c.id} href={`/hr/recruitment/candidates/${c.id}`}>
                      <div className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] cursor-pointer" style={{ border: '1px solid #e4e4e4' }}>
                        <EmployeeAvatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>{c.first_name} {c.last_name}</p>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{c.education} | {c.experience_years}yr exp | {(c.expected_salary / 1000000).toFixed(1)}M IQD</p>
                        </div>
                        <SmartStatusBadge status={c.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '24px' }}>No applicants yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Vacancy Details</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Position</span><span style={{ fontWeight: 600 }}>{vacancy.position}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Department</span><span style={{ fontWeight: 500 }}>{vacancy.department}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Openings</span><span style={{ fontWeight: 500 }}>{vacancy.openings}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Salary Range</span><span style={{ fontWeight: 500 }}>{(vacancy.salary_min / 1000000).toFixed(1)}-{(vacancy.salary_max / 1000000).toFixed(1)}M IQD</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Deadline</span><span style={{ fontWeight: 500 }}>{vacancy.deadline}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Status</span><SmartStatusBadge status={vacancy.status} /></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Total Applicants</span><span style={{ fontWeight: 600 }}>{candidates.length}</span></div>
            </div>
          </div>

          {vacancy.requirements && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Requirements</h3></div>
              <div className="tibbna-card-content">
                <ul style={{ fontSize: '12px', color: '#525252', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(vacancy.requirements as string[]).map((r: string, i: number) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
