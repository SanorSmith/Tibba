'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import leavesData from '@/data/hr/leaves.json';

const leaveTypeColors: Record<string, string> = {
  'Annual Leave': '#3B82F6',
  'Sick Leave': '#EF4444',
  'Emergency Leave': '#F59E0B',
  'Maternity Leave': '#EC4899',
  'Paternity Leave': '#8B5CF6',
  'Unpaid Leave': '#6B7280',
  'Hajj Leave': '#059669',
  'Study Leave': '#0EA5E9',
};

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function LeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const approvedLeaves = useMemo(() => {
    let leaves = leavesData.leave_requests.filter(lr => lr.status === 'APPROVED');
    if (typeFilter !== 'all') leaves = leaves.filter(lr => lr.leave_type === typeFilter);
    return leaves;
  }, [typeFilter]);

  const holidays = leavesData.holidays;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 1) % 7;
  const totalDays = lastDay.getDate();

  const calendarDays = useMemo(() => {
    const days: { date: number; leaves: any[]; isHoliday: boolean; holidayName?: string }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLeaves = approvedLeaves.filter(lr => {
        return dateStr >= lr.start_date && dateStr <= lr.end_date;
      });
      const holiday = holidays.find(h => h.date === dateStr);
      days.push({ date: d, leaves: dayLeaves, isHoliday: !!holiday, holidayName: holiday?.name });
    }
    return days;
  }, [year, month, totalDays, approvedLeaves, holidays]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date(2026, 1, 1));

  const leaveTypes = [...new Set(leavesData.leave_requests.map(lr => lr.leave_type))];

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Calendar</h2>
            <p className="page-description">Visual overview of approved leaves and holidays</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')} className="btn-secondary">
            {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
              <h3 style={{ fontSize: '18px', fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>{monthName}</h3>
              <button onClick={nextMonth} className="btn-secondary p-2"><ChevronRight size={16} /></button>
              <button onClick={goToday} className="btn-secondary" style={{ fontSize: '12px' }}>Today</button>
            </div>
            <select className="tibbna-input" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Leave Types</option>
              {leaveTypes.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 tibbna-section">
        {Object.entries(leaveTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span style={{ fontSize: '11px', color: '#525252' }}>{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }} />
          <span style={{ fontSize: '11px', color: '#525252' }}>Holiday</span>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            {/* Header */}
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: '#e4e4e4' }}>
              {DAYS.map(d => (
                <div key={d} style={{ backgroundColor: '#f9fafb', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: d === 'Fri' ? '#EF4444' : '#525252' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: '#e4e4e4' }}>
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} style={{ backgroundColor: '#f9fafb', minHeight: '80px' }} />
              ))}
              {calendarDays.map(day => (
                <div
                  key={day.date}
                  style={{
                    backgroundColor: day.isHoliday ? '#FFFBEB' : '#fff',
                    minHeight: '80px',
                    padding: '4px',
                    cursor: day.leaves.length > 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => { if (day.leaves.length > 0) setSelectedLeave(day.leaves[0]); }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: day.isHoliday ? '#92400E' : '#111827' }}>{day.date}</span>
                    {day.isHoliday && <span style={{ fontSize: '8px', color: '#92400E' }}>🏛</span>}
                  </div>
                  {day.isHoliday && (
                    <p style={{ fontSize: '9px', color: '#92400E', lineHeight: '1.2' }}>{day.holidayName}</p>
                  )}
                  {day.leaves.slice(0, 3).map((lr, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: leaveTypeColors[lr.leave_type] || '#6B7280',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 4px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lr.employee_name.split(' ')[0]}
                    </div>
                  ))}
                  {day.leaves.length > 3 && (
                    <p style={{ fontSize: '9px', color: '#a3a3a3', marginTop: '2px' }}>+{day.leaves.length - 3} more</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Approved Leaves - {monthName}</h3></div>
          <div className="tibbna-card-content">
            {approvedLeaves.length > 0 ? (
              <div className="space-y-2">
                {approvedLeaves.map(lr => (
                  <div key={lr.id} className="flex items-center gap-3" style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: leaveTypeColors[lr.leave_type] || '#6B7280' }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{lr.employee_name}</p>
                      <p style={{ fontSize: '12px', color: '#525252' }}>{lr.leave_type} | {lr.start_date} → {lr.end_date} ({lr.total_days} days)</p>
                    </div>
                    <span className="tibbna-badge" style={{ backgroundColor: leaveTypeColors[lr.leave_type] || '#6B7280', color: '#fff', fontSize: '10px' }}>
                      {lr.leave_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '32px' }}>No approved leaves for this period</p>
            )}
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {selectedLeave && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedLeave(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm" style={{ border: '1px solid #e4e4e4' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e4e4e4' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Leave Details</h3>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div><span style={{ color: '#a3a3a3' }}>Employee</span><p style={{ fontWeight: 500 }}>{selectedLeave.employee_name}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Leave Type</span><p style={{ fontWeight: 500 }}>{selectedLeave.leave_type}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Period</span><p style={{ fontWeight: 500 }}>{selectedLeave.start_date} → {selectedLeave.end_date}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Days</span><p style={{ fontWeight: 500 }}>{selectedLeave.total_days}</p></div>
                <div><span style={{ color: '#a3a3a3' }}>Reason</span><p style={{ fontWeight: 500 }}>{selectedLeave.reason}</p></div>
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid #e4e4e4', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setSelectedLeave(null)}>Close</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
