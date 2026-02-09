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
      { name: 'Employee Master List', description: 'Complete directory of all employees', route: '/hr/reports/employee' },
      { name: 'New Hires Report', description: 'Monthly and quarterly new hire summary', route: '/hr/reports/employee' },
      { name: 'Termination Report', description: 'Employee separations and reasons', route: '/hr/reports/employee' },
      { name: 'Headcount by Department', description: 'Staff distribution across departments', route: '/hr/reports/employee' },
      { name: 'Demographics Report', description: 'Age, gender, nationality breakdown', route: '/hr/reports/employee' },
    ],
  },
  {
    title: 'Attendance Reports',
    icon: Clock,
    color: '#10B981',
    bg: '#D1FAE5',
    reports: [
      { name: 'Daily Attendance Summary', description: 'Today\'s attendance overview', route: '/hr/reports/attendance' },
      { name: 'Monthly Attendance Report', description: 'Monthly attendance trends', route: '/hr/reports/attendance' },
      { name: 'Overtime Report', description: 'Overtime hours and costs', route: '/hr/reports/attendance' },
      { name: 'Late Arrival Report', description: 'Late arrivals and early departures', route: '/hr/reports/attendance' },
      { name: 'Absence Report', description: 'Unexcused absences by department', route: '/hr/reports/attendance' },
    ],
  },
  {
    title: 'Payroll Reports',
    icon: DollarSign,
    color: '#F59E0B',
    bg: '#FEF3C7',
    reports: [
      { name: 'Monthly Payroll Summary', description: 'Total payroll costs breakdown', route: '/hr/reports/payroll' },
      { name: 'Department Payroll Cost', description: 'Cost analysis by department', route: '/hr/reports/payroll' },
      { name: 'Bank Transfer File', description: 'Generate bank transfer CSV', route: '/hr/payroll/bank-transfer' },
      { name: 'Social Security Report', description: 'Employee and employer contributions', route: '/hr/payroll/social-security' },
      { name: 'End of Service Provision', description: 'EOS liability calculations', route: '/hr/payroll/end-of-service' },
    ],
  },
  {
    title: 'Leave Reports',
    icon: Calendar,
    color: '#6366F1',
    bg: '#E0E7FF',
    reports: [
      { name: 'Leave Balance Report', description: 'Current balances for all employees', route: '/hr/leaves' },
      { name: 'Leave Utilization', description: 'Leave usage patterns and trends', route: '/hr/leaves' },
      { name: 'Sick Leave Analysis', description: 'Sick leave frequency and patterns', route: '/hr/leaves' },
      { name: 'Annual Leave Forecast', description: 'Projected leave usage', route: '/hr/leaves/calendar' },
    ],
  },
  {
    title: 'Training Reports',
    icon: GraduationCap,
    color: '#EC4899',
    bg: '#FCE7F3',
    reports: [
      { name: 'Training Completion', description: 'Completion rates by program', route: '/hr/training' },
      { name: 'CME Credits Report', description: 'CME credits earned per staff', route: '/hr/training' },
      { name: 'Certification Expiry', description: 'Upcoming certification expirations', route: '/hr/training' },
      { name: 'Training Budget vs Actual', description: 'Budget utilization analysis', route: '/hr/training' },
    ],
  },
  {
    title: 'Performance Reports',
    icon: Star,
    color: '#EF4444',
    bg: '#FEE2E2',
    reports: [
      { name: 'Performance Distribution', description: 'Rating distribution bell curve', route: '/hr/performance' },
      { name: 'Goal Achievement', description: 'Goal completion rates', route: '/hr/performance/goals' },
      { name: 'Recognition Report', description: 'Awards and recognitions given', route: '/hr/performance' },
    ],
  },
  {
    title: 'Compliance Reports',
    icon: Shield,
    color: '#059669',
    bg: '#D1FAE5',
    reports: [
      { name: 'License Expiry Report', description: 'Medical licenses expiring soon', route: '/hr/integrations/openehr' },
      { name: 'Vaccination Compliance', description: 'Staff vaccination status', route: '/hr/integrations/openehr' },
      { name: 'Mandatory Training', description: 'Training compliance rates', route: '/hr/training' },
      { name: 'Contract Expiry', description: 'Contracts expiring soon', route: '/hr/employees' },
    ],
  },
  {
    title: 'Executive Dashboard',
    icon: BarChart3,
    color: '#8B5CF6',
    bg: '#F3E8FF',
    reports: [
      { name: 'HR KPI Dashboard', description: 'Key performance indicators', route: '/hr' },
      { name: 'Headcount Trends', description: 'Staffing trends over time', route: '/hr/reports/employee' },
      { name: 'Turnover Analysis', description: 'Employee turnover rates', route: '/hr/reports/employee' },
      { name: 'Cost per Employee', description: 'Total cost analysis', route: '/hr/reports/payroll' },
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
                  <Link
                    key={report.name}
                    href={report.route}
                    className="flex items-center justify-between cursor-pointer hover:bg-[#f5f5f5] transition-colors"
                    style={{ padding: '8px 10px', borderRadius: '4px' }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500 }}>{report.name}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{report.description}</p>
                    </div>
                    <FileText size={14} style={{ color: '#a3a3a3', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
