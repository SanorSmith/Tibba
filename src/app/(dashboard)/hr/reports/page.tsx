'use client';

import Link from 'next/link';
import { FileText, Users, Clock, DollarSign, Calendar, GraduationCap, Star, Shield, BarChart3 } from 'lucide-react';

const reportCategories = [
  {
    title: 'Employee Reports',
    icon: Users,
    color: '#3B82F6',
    bg: '#DBEAFE',
    reports: [
      { name: 'Employee Master List', description: 'Complete directory of all employees' },
      { name: 'New Hires Report', description: 'Monthly and quarterly new hire summary' },
      { name: 'Termination Report', description: 'Employee separations and reasons' },
      { name: 'Headcount by Department', description: 'Staff distribution across departments' },
      { name: 'Demographics Report', description: 'Age, gender, nationality breakdown' },
    ],
  },
  {
    title: 'Attendance Reports',
    icon: Clock,
    color: '#10B981',
    bg: '#D1FAE5',
    reports: [
      { name: 'Daily Attendance Summary', description: 'Today\'s attendance overview' },
      { name: 'Monthly Attendance Report', description: 'Monthly attendance trends' },
      { name: 'Overtime Report', description: 'Overtime hours and costs' },
      { name: 'Late Arrival Report', description: 'Late arrivals and early departures' },
      { name: 'Absence Report', description: 'Unexcused absences by department' },
    ],
  },
  {
    title: 'Payroll Reports',
    icon: DollarSign,
    color: '#F59E0B',
    bg: '#FEF3C7',
    reports: [
      { name: 'Monthly Payroll Summary', description: 'Total payroll costs breakdown' },
      { name: 'Department Payroll Cost', description: 'Cost analysis by department' },
      { name: 'Bank Transfer File', description: 'Generate bank transfer CSV' },
      { name: 'Social Security Report', description: 'Employee and employer contributions' },
      { name: 'End of Service Provision', description: 'EOS liability calculations' },
    ],
  },
  {
    title: 'Leave Reports',
    icon: Calendar,
    color: '#6366F1',
    bg: '#E0E7FF',
    reports: [
      { name: 'Leave Balance Report', description: 'Current balances for all employees' },
      { name: 'Leave Utilization', description: 'Leave usage patterns and trends' },
      { name: 'Sick Leave Analysis', description: 'Sick leave frequency and patterns' },
      { name: 'Annual Leave Forecast', description: 'Projected leave usage' },
    ],
  },
  {
    title: 'Training Reports',
    icon: GraduationCap,
    color: '#EC4899',
    bg: '#FCE7F3',
    reports: [
      { name: 'Training Completion', description: 'Completion rates by program' },
      { name: 'CME Credits Report', description: 'CME credits earned per staff' },
      { name: 'Certification Expiry', description: 'Upcoming certification expirations' },
      { name: 'Training Budget vs Actual', description: 'Budget utilization analysis' },
    ],
  },
  {
    title: 'Performance Reports',
    icon: Star,
    color: '#EF4444',
    bg: '#FEE2E2',
    reports: [
      { name: 'Performance Distribution', description: 'Rating distribution bell curve' },
      { name: 'Goal Achievement', description: 'Goal completion rates' },
      { name: 'Recognition Report', description: 'Awards and recognitions given' },
    ],
  },
  {
    title: 'Compliance Reports',
    icon: Shield,
    color: '#059669',
    bg: '#D1FAE5',
    reports: [
      { name: 'License Expiry Report', description: 'Medical licenses expiring soon' },
      { name: 'Vaccination Compliance', description: 'Staff vaccination status' },
      { name: 'Mandatory Training', description: 'Training compliance rates' },
      { name: 'Contract Expiry', description: 'Contracts expiring soon' },
    ],
  },
  {
    title: 'Executive Dashboard',
    icon: BarChart3,
    color: '#8B5CF6',
    bg: '#F3E8FF',
    reports: [
      { name: 'HR KPI Dashboard', description: 'Key performance indicators' },
      { name: 'Headcount Trends', description: 'Staffing trends over time' },
      { name: 'Turnover Analysis', description: 'Employee turnover rates' },
      { name: 'Cost per Employee', description: 'Total cost analysis' },
    ],
  },
];

export default function HRReportsPage() {
  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">HR Reports & Analytics</h2>
          <p className="page-description">Comprehensive reporting across all HR functions</p>
        </div>
      </div>

      <div className="tibbna-grid-2">
        {reportCategories.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="tibbna-card">
              <div className="tibbna-card-header">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.bg }}>
                    <Icon size={16} style={{ color: cat.color }} />
                  </div>
                  <h3 className="tibbna-section-title" style={{ margin: 0 }}>{cat.title}</h3>
                </div>
              </div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cat.reports.map(report => (
                  <div
                    key={report.name}
                    className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f5] transition-colors"
                    style={{ padding: '8px 10px', borderRadius: '4px' }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500 }}>{report.name}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{report.description}</p>
                    </div>
                    <FileText size={14} style={{ color: '#a3a3a3', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
