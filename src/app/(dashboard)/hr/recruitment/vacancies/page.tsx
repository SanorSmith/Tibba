'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, MapPin, DollarSign, Users, Clock } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import candidatesData from '@/data/hr/candidates.json';

export default function VacanciesListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const vacancies = candidatesData.vacancies as any[];
  const departments = [...new Set(vacancies.map(v => v.department))].sort();

  const filtered = useMemo(() => {
    let data = vacancies;
    if (statusFilter !== 'all') data = data.filter(v => v.status === statusFilter);
    if (deptFilter !== 'all') data = data.filter(v => v.department === deptFilter);
    return data;
  }, [vacancies, statusFilter, deptFilter]);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Job Vacancies</h2>
            <p className="page-description">{vacancies.length} vacancies | {vacancies.filter(v => v.status === 'OPEN').length} open</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 tibbna-section">
        <select className="tibbna-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
        <select className="tibbna-input" style={{ width: 'auto' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => (<option key={d} value={d}>{d}</option>))}
        </select>
      </div>

      {/* Vacancy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => (
          <Link key={v.id} href={`/hr/recruitment/vacancies/${v.id}`}>
            <div className="tibbna-card h-full cursor-pointer hover:shadow-md transition-shadow">
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="flex justify-between items-start">
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{v.position}</h3>
                  <SmartStatusBadge status={v.status} />
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#525252' }}>
                  <MapPin size={12} /> {v.department}
                </div>
                <div className="flex items-center gap-4" style={{ fontSize: '12px', color: '#525252' }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {v.openings} opening{v.openings > 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><DollarSign size={12} /> {(v.salary_min / 1000000).toFixed(1)}-{(v.salary_max / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: '11px', color: '#a3a3a3' }}>
                  <Clock size={11} /> Deadline: {v.deadline}
                </div>
                <div className="flex justify-between items-center" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#525252' }}>{v.applicants || 0} applicants</span>
                  <span style={{ fontSize: '12px', color: '#618FF5', fontWeight: 500 }}>View Details →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full tibbna-card">
            <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>No vacancies match filters</div>
          </div>
        )}
      </div>
    </>
  );
}
