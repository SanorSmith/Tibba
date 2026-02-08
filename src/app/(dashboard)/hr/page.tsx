'use client';

import Link from 'next/link';
import {
  Users, UserCheck, Calendar, TrendingUp, DollarSign, GraduationCap,
  ClipboardList, Star, Heart, Building2, FileText, Clock, UserPlus,
  AlertTriangle, Award, Briefcase
} from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
import attendanceData from '@/data/hr/attendance.json';
import leavesData from '@/data/hr/leaves.json';
import payrollData from '@/data/hr/payroll.json';
import trainingData from '@/data/hr/training.json';
import performanceData from '@/data/hr/performance.json';
import candidatesData from '@/data/hr/candidates.json';

export default function HRPage() {
  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const onLeave = employeesData.employees.filter(e => e.employment_status === 'ON_LEAVE');
  const presentToday = attendanceData.daily_summaries.filter(a => a.status === 'PRESENT').length;
  const absentToday = attendanceData.daily_summaries.filter(a => a.status === 'ABSENT').length;
  const pendingLeaves = leavesData.leave_requests.filter(l => l.status === 'PENDING_APPROVAL').length;
  const openVacancies = candidatesData.vacancies.filter(v => v.status === 'OPEN').length;
  const expiringCerts = trainingData.training_summary.expiring_certifications;
  const latestPayroll = payrollData.payroll_periods[payrollData.payroll_periods.length - 1];

  const quickActions = [
    { href: '/hr/employees', icon: Users, label: 'Employees' },
    { href: '/hr/attendance', icon: Clock, label: 'Attendance' },
    { href: '/hr/leaves', icon: Calendar, label: 'Leaves' },
    { href: '/hr/payroll', icon: DollarSign, label: 'Payroll' },
    { href: '/hr/recruitment', icon: UserPlus, label: 'Recruitment' },
    { href: '/hr/training', icon: GraduationCap, label: 'Training' },
    { href: '/hr/performance', icon: Star, label: 'Performance' },
    { href: '/hr/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Human Resources</h2>
          <p className="page-description">Employee management, payroll, attendance & development</p>
        </div>
        <Link href="/hr/employees">
          <button className="btn-primary flex items-center gap-2">
            <UserPlus size={16} />
            Add Employee
          </button>
        </Link>
      </div>

      {/* KPI Metrics */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Employees</p>
                <p className="tibbna-card-value">{activeEmployees.length}</p>
                <p className="tibbna-card-subtitle">{onLeave.length} on leave</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <Users size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Present Today</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{presentToday}</p>
                <p className="tibbna-card-subtitle">{absentToday} absent</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <UserCheck size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Pending Leaves</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{pendingLeaves}</p>
                <p className="tibbna-card-subtitle">Awaiting approval</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Open Vacancies</p>
                <p className="tibbna-card-value" style={{ color: '#6366F1' }}>{openVacancies}</p>
                <p className="tibbna-card-subtitle">{candidatesData.recruitment_summary.total_candidates} applicants</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <Briefcase size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts & Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Alerts */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}>
                <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                HR Alerts
              </h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {expiringCerts > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tibbna-badge badge-warning">WARNING</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{expiringCerts} Expiring Certifications</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#92400E' }}>Staff members have certifications expiring within 60 days</p>
                </div>
              )}
              {pendingLeaves > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#DBEAFE', border: '1px solid #BFDBFE' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tibbna-badge badge-info">INFO</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{pendingLeaves} Pending Leave Requests</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#1E40AF' }}>Leave requests awaiting manager approval</p>
                </div>
              )}
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="tibbna-badge badge-error">URGENT</span>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Payroll Processing Due</span>
                </div>
                <p style={{ fontSize: '12px', color: '#991B1B' }}>{latestPayroll.name} payroll is in {latestPayroll.status} status</p>
              </div>
              {performanceData.reviews.filter(r => r.status === 'SUBMITTED').length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tibbna-badge" style={{ backgroundColor: '#7C3AED', color: '#fff' }}>REVIEW</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{performanceData.reviews.filter(r => r.status === 'SUBMITTED').length} Performance Reviews Pending</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#5B21B6' }}>Reviews submitted and awaiting finalization</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Recent Activity</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {performanceData.recognitions.slice(0, 3).map(rec => (
                <div key={rec.id} className="flex items-start gap-3" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                    <Award size={16} style={{ color: '#F59E0B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{rec.title}</p>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{rec.employee_name} - {rec.reason.substring(0, 60)}...</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{rec.date}</p>
                  </div>
                </div>
              ))}
              {leavesData.leave_requests.filter(l => l.status === 'APPROVED').slice(0, 2).map(lr => (
                <div key={lr.id} className="flex items-start gap-3" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#DBEAFE' }}>
                    <Calendar size={16} style={{ color: '#3B82F6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>Leave Approved: {lr.leave_type}</p>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{lr.employee_name} - {lr.start_date} to {lr.end_date}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Approved by {lr.approver_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions + Stats */}
        <div className="space-y-4">
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Quick Actions</h3>
            </div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div
                        className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                        style={{ height: '72px', border: '1px solid #e4e4e4' }}
                      >
                        <Icon size={20} style={{ color: '#525252' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#525252' }}>{action.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Staff by Category</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Medical Staff', count: activeEmployees.filter(e => e.employee_category === 'MEDICAL_STAFF').length, color: '#3B82F6' },
                { label: 'Nursing', count: activeEmployees.filter(e => e.employee_category === 'NURSING').length, color: '#EC4899' },
                { label: 'Administrative', count: activeEmployees.filter(e => e.employee_category === 'ADMINISTRATIVE').length, color: '#6366F1' },
                { label: 'Technical', count: activeEmployees.filter(e => e.employee_category === 'TECHNICAL').length, color: '#10B981' },
                { label: 'Support', count: activeEmployees.filter(e => e.employee_category === 'SUPPORT').length, color: '#F59E0B' },
              ].map(cat => (
                <div key={cat.label} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span style={{ fontSize: '13px', color: '#525252' }}>{cat.label}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payroll Quick View */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Payroll Overview</h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Current Period</span>
                <span style={{ fontWeight: 600 }}>{latestPayroll.name}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Status</span>
                <span className="tibbna-badge badge-warning">{latestPayroll.status}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Total Gross</span>
                <span style={{ fontWeight: 600 }}>{(latestPayroll.total_gross / 1000000).toFixed(1)}M IQD</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Total Net</span>
                <span style={{ fontWeight: 600 }}>{(latestPayroll.total_net / 1000000).toFixed(1)}M IQD</span>
              </div>
              <Link href="/hr/payroll" className="block" style={{ marginTop: '8px' }}>
                <button className="btn-secondary" style={{ width: '100%' }}>View Payroll</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
