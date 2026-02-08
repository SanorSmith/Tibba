'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, CheckCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import employeesData from '@/data/hr/employees.json';

const demoGoals = [
  { id: 'G-001', employee_id: 'EMP-2024-003', employee_name: 'Omar Al-Bayati', department: 'Cardiology', goal_title: 'Reduce cardiac readmission rate', category: 'Clinical Quality', target: 100, current: 75, status: 'IN_PROGRESS', due_date: '2026-06-30', weight: 30 },
  { id: 'G-002', employee_id: 'EMP-2024-003', employee_name: 'Omar Al-Bayati', department: 'Cardiology', goal_title: 'Complete 20 CME credits', category: 'Professional Development', target: 20, current: 14, status: 'IN_PROGRESS', due_date: '2026-12-31', weight: 20 },
  { id: 'G-003', employee_id: 'EMP-2024-003', employee_name: 'Omar Al-Bayati', department: 'Cardiology', goal_title: 'Mentor 2 junior cardiologists', category: 'Leadership', target: 2, current: 2, status: 'COMPLETED', due_date: '2026-06-30', weight: 15 },
  { id: 'G-004', employee_id: 'EMP-2024-005', employee_name: 'Mustafa Al-Janabi', department: 'Surgery', goal_title: 'Achieve 95% surgical success rate', category: 'Clinical Quality', target: 95, current: 97, status: 'COMPLETED', due_date: '2026-06-30', weight: 40 },
  { id: 'G-005', employee_id: 'EMP-2024-005', employee_name: 'Mustafa Al-Janabi', department: 'Surgery', goal_title: 'Implement new laparoscopic techniques', category: 'Innovation', target: 100, current: 60, status: 'IN_PROGRESS', due_date: '2026-09-30', weight: 30 },
  { id: 'G-006', employee_id: 'EMP-2024-008', employee_name: 'Sara Mohammed', department: 'Internal Medicine', goal_title: 'Publish 2 research papers', category: 'Research', target: 2, current: 1, status: 'IN_PROGRESS', due_date: '2026-12-31', weight: 25 },
  { id: 'G-007', employee_id: 'EMP-2024-008', employee_name: 'Sara Mohammed', department: 'Internal Medicine', goal_title: 'Improve patient satisfaction score', category: 'Patient Care', target: 90, current: 88, status: 'IN_PROGRESS', due_date: '2026-06-30', weight: 35 },
  { id: 'G-008', employee_id: 'EMP-2024-010', employee_name: 'Hassan Al-Dulaimi', department: 'Nursing', goal_title: 'Complete ICU certification', category: 'Professional Development', target: 100, current: 100, status: 'COMPLETED', due_date: '2026-03-31', weight: 40 },
  { id: 'G-009', employee_id: 'EMP-2024-010', employee_name: 'Hassan Al-Dulaimi', department: 'Nursing', goal_title: 'Reduce medication errors by 50%', category: 'Clinical Quality', target: 50, current: 35, status: 'IN_PROGRESS', due_date: '2026-06-30', weight: 30 },
  { id: 'G-010', employee_id: 'EMP-2024-015', employee_name: 'Layla Al-Obeidi', department: 'Pharmacy', goal_title: 'Implement automated dispensing', category: 'Innovation', target: 100, current: 40, status: 'IN_PROGRESS', due_date: '2026-09-30', weight: 35 },
  { id: 'G-011', employee_id: 'EMP-2024-015', employee_name: 'Layla Al-Obeidi', department: 'Pharmacy', goal_title: 'Reduce dispensing errors to <1%', category: 'Clinical Quality', target: 100, current: 85, status: 'IN_PROGRESS', due_date: '2026-06-30', weight: 30 },
  { id: 'G-012', employee_id: 'EMP-2024-025', employee_name: 'Adel Al-Maliki', department: 'Finance', goal_title: 'Reduce billing cycle time by 20%', category: 'Operational Efficiency', target: 20, current: 0, status: 'NOT_STARTED', due_date: '2026-12-31', weight: 30 },
];

export default function PerformanceGoalsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const goals = demoGoals;
  const categories = [...new Set(goals.map(g => g.category))].sort();
  const employees = [...new Set(goals.map(g => g.employee_name))].sort();

  const filtered = useMemo(() => {
    let g = goals;
    if (statusFilter !== 'all') g = g.filter(x => x.status === statusFilter);
    if (categoryFilter !== 'all') g = g.filter(x => x.category === categoryFilter);
    if (employeeFilter !== 'all') g = g.filter(x => x.employee_name === employeeFilter);
    return g;
  }, [goals, statusFilter, categoryFilter, employeeFilter]);

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'COMPLETED').length,
    inProgress: goals.filter(g => g.status === 'IN_PROGRESS').length,
    notStarted: goals.filter(g => g.status === 'NOT_STARTED').length,
    avgCompletion: goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.current / g.target) * 100, 0) / goals.length) : 0,
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/performance"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Performance Goals</h2>
            <p className="page-description">Track employee goals and objectives</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Goals</p><p className="tibbna-card-value">{stats.total}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Target size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Completed</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.completed}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">In Progress</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.inProgress}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Clock size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Completion</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{stats.avgCompletion}%</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><TrendingUp size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 tibbna-section">
        <select className="tibbna-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="NOT_STARTED">Not Started</option>
        </select>
        <select className="tibbna-input" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select className="tibbna-input" style={{ width: 'auto' }} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
          <option value="all">All Employees</option>
          {employees.map(e => (<option key={e} value={e}>{e}</option>))}
        </select>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {filtered.map(goal => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <div key={goal.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <EmployeeAvatar name={goal.employee_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>{goal.goal_title}</span>
                        <SmartStatusBadge status={goal.status} />
                      </div>
                      <p style={{ fontSize: '12px', color: '#525252' }}>
                        {goal.employee_name} | {goal.department} | {goal.category} | Weight: {goal.weight}%
                      </p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Due: {goal.due_date}</p>
                      {/* Progress Bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1" style={{ height: '8px', backgroundColor: '#f3f4f6' }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '36px' }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: pct >= 100 ? '#10B981' : '#111827' }}>{goal.current}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>of {goal.target}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="tibbna-card">
            <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>
              No goals match the current filters
            </div>
          </div>
        )}
      </div>
    </>
  );
}
