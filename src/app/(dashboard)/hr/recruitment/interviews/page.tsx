'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Plus, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';


const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: '#DBEAFE', text: '#1D4ED8' },
  COMPLETED: { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
  RESCHEDULED: { bg: '#FEF3C7', text: '#92400E' },
};

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recruitment/interviews`);
      const data = await res.json();
      if (data.success) setInterviews(data.data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const groupByDate = (items: any[]) => {
    const grouped: Record<string, any[]> = {};
    items.forEach((item) => {
      const date = item.scheduled_date ? new Date(item.scheduled_date).toDateString() : 'Unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  };

  const upcoming = interviews.filter(i => i.status === 'SCHEDULED').length;
  const completed = interviews.filter(i => i.status === 'COMPLETED').length;
  const thisWeek = interviews.filter(i => {
    if (!i.scheduled_date) return false;
    const d = new Date(i.scheduled_date);
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= week;
  }).length;

  const grouped = groupByDate(interviews);

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Interviews</h2>
          <p className="page-description">Schedule and manage candidate interviews</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/recruitment/interviews/schedule">
            <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Schedule Interview</button>
          </Link>
          <Link href="/hr/recruitment">
            <button className="btn-secondary flex items-center gap-2"><Users size={16} /> Recruitment</button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Upcoming</p><p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{upcoming}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Calendar size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">This Week</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{thisWeek}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Clock size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Completed</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{completed}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total</p><p className="tibbna-card-value">{interviews.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><Users size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Interview List grouped by date */}
      {loading ? (
        <div className="text-center py-8">Loading interviews...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-8" style={{ color: '#a3a3a3' }}>No interviews found</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8, color: '#525252' }}>{date}</h3>
              <div className="space-y-2">
                {(items as any[]).map((iv) => {
                  const sc = statusColors[iv.status] || { bg: '#F3F4F6', text: '#374151' };
                  return (
                    <div
                      key={iv.interview_id}
                      className="tibbna-card cursor-pointer hover:shadow-md"
                      onClick={() => router.push(`/hr/recruitment/interviews/${iv.interview_id}`)}
                    >
                      <div className="tibbna-card-content">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a3a3a3', fontSize: '13px', minWidth: 60 }}>
                              <Clock size={14} />
                              {iv.scheduled_start_time || '--:--'}
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 600 }}>
                                {iv.candidate_first_name} {iv.candidate_last_name}
                              </p>
                              <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                                {iv.interview_type} | {iv.vacancy_position || ''} | {iv.duration_minutes || 60}min
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text }}>{iv.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
