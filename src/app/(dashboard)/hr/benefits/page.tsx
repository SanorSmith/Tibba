'use client';

import Link from 'next/link';
import { Heart, Shield, Car, Home, UtensilsCrossed, DollarSign } from 'lucide-react';
import benefitsData from '@/data/hr/benefits.json';

const typeRoutes: Record<string, string> = {
  HEALTH_INSURANCE: '/hr/benefits/health-insurance',
  LIFE_INSURANCE: '/hr/benefits/health-insurance',
  TRANSPORT: '/hr/benefits/transport',
  HOUSING: '/hr/benefits/housing',
  MEAL: '/hr/benefits',
  EDUCATION: '/hr/benefits',
};

const typeIcons: Record<string, any> = {
  HEALTH_INSURANCE: Shield,
  LIFE_INSURANCE: Shield,
  TRANSPORT: Car,
  HOUSING: Home,
  MEAL: UtensilsCrossed,
  EDUCATION: DollarSign,
};

export default function BenefitsPage() {
  const summary = benefitsData.benefits_summary;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Benefits Management</h2>
          <p className="page-description">Insurance, transport, housing, and meal benefits</p>
        </div>
      </div>

      <div className="tibbna-grid-3 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Enrolled</p><p className="tibbna-card-value">{summary.total_enrolled}</p><p className="tibbna-card-subtitle">employees</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Heart size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Employer Cost</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(summary.monthly_employer_cost / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD/month</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><DollarSign size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Employee Cost</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(summary.monthly_employee_cost / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD/month</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><DollarSign size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
      </div>

      {/* Benefit Plans */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Benefit Plans</h3></div>
        <div className="tibbna-card-content">
          <div className="tibbna-grid-2">
            {benefitsData.benefit_plans.map(plan => {
              const Icon = typeIcons[plan.type] || Heart;
              return (
                <Link key={plan.id} href={typeRoutes[plan.type] || '/hr/benefits'} style={{ padding: '16px', border: '1px solid #e4e4e4', display: 'block' }} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#DBEAFE' }}>
                      <Icon size={18} style={{ color: '#3B82F6' }} />
                    </div>
                    <div className="flex-1">
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{plan.name}</h4>
                      <span className="tibbna-badge" style={{ backgroundColor: plan.category === 'MANDATORY' ? '#FEE2E2' : plan.category === 'EMPLOYER_PAID' ? '#D1FAE5' : '#FEF3C7', color: plan.category === 'MANDATORY' ? '#991B1B' : plan.category === 'EMPLOYER_PAID' ? '#065F46' : '#92400E', fontSize: '10px', marginTop: '4px', display: 'inline-block' }}>{plan.category.replace(/_/g, ' ')}</span>
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Provider: {plan.provider}</span>
                        {plan.cost_employer > 0 && <span>Employer: {(plan.cost_employer / 1000).toFixed(0)}K IQD/mo</span>}
                        {plan.cost_employee > 0 && <span>Employee: {(plan.cost_employee / 1000).toFixed(0)}K IQD/mo</span>}
                        {plan.coverage && <span>Coverage: {(plan.coverage / 1000000).toFixed(0)}M IQD</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Recent Enrollments</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Plan</th><th>Status</th><th>Start Date</th><th>Dependents</th></tr></thead>
              <tbody>
                {benefitsData.enrollments.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{e.employee_name}</td>
                    <td style={{ fontSize: '13px' }}>{e.plan_name}</td>
                    <td><span className="tibbna-badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>{e.status}</span></td>
                    <td style={{ fontSize: '13px' }}>{e.start_date}</td>
                    <td style={{ fontSize: '13px' }}>{e.dependents ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {benefitsData.enrollments.map(e => (
              <div key={e.id} style={{ padding: '8px', border: '1px solid #e4e4e4' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{e.employee_name}</span>
                  <span className="tibbna-badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '10px' }}>{e.status}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#525252' }}>{e.plan_name}</p>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Since {e.start_date}{e.dependents ? ` | ${e.dependents} dependents` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
