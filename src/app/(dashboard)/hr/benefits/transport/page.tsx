'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, Users, DollarSign } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import benefitsData from '@/data/hr/benefits.json';
import employeesData from '@/data/hr/employees.json';

export default function TransportBenefitsPage() {
  const plans = (benefitsData.benefit_plans as any[]).filter(p => p.type === 'TRANSPORT');
  const enrollments = (benefitsData.enrollments as any[]).filter(e => {
    const plan = plans.find(p => p.id === e.plan_id);
    return !!plan;
  });
  const employees = employeesData.employees;

  const stats = useMemo(() => ({
    totalPlans: plans.length,
    enrolled: enrollments.filter(e => e.status === 'ACTIVE').length,
    monthlyCost: enrollments.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + (e.employer_contribution || 0), 0),
  }), [plans, enrollments]);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/benefits"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Transport Benefits</h2>
            <p className="page-description">Transport allowances and company vehicle assignments</p>
          </div>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Transport Plans</p><p className="tibbna-card-value">{stats.totalPlans}</p></div><Car size={20} style={{ color: '#3B82F6' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Enrolled</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.enrolled}</p></div><Users size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Monthly Cost</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(stats.monthlyCost / 1000).toFixed(0)}K</p><p className="tibbna-card-subtitle">IQD (employer)</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Coverage Rate</p><p className="tibbna-card-value">{employees.filter(e => e.employment_status === 'ACTIVE').length > 0 ? Math.round((stats.enrolled / employees.filter(e => e.employment_status === 'ACTIVE').length) * 100) : 0}%</p></div></div>
      </div>

      {/* Transport Options */}
      <h3 className="tibbna-section-title tibbna-section">Transport Options</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.length > 0 ? plans.map((plan: any) => {
          const count = enrollments.filter(e => e.plan_id === plan.id && e.status === 'ACTIVE').length;
          return (
            <div key={plan.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center gap-2 mb-3">
                  <Car size={18} style={{ color: '#618FF5' }} />
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{plan.name}</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Category</span><span style={{ fontWeight: 500 }}>{plan.category}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Employer Cost</span><span style={{ fontWeight: 500 }}>{(plan.cost_to_employer / 1000).toFixed(0)}K IQD/mo</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Assigned</span><span style={{ fontWeight: 600, color: '#10B981' }}>{count}</span></div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full">
            {/* Default transport options when no specific plans exist */}
            {[
              { name: 'Fuel Allowance', desc: 'Monthly fuel reimbursement for personal vehicle', cost: 100000, assigned: employees.filter(e => e.employment_status === 'ACTIVE' && ['G7', 'G8', 'G9', 'G10'].includes(e.grade_id)).length },
              { name: 'Company Shuttle', desc: 'Daily shuttle service from designated pickup points', cost: 50000, assigned: employees.filter(e => e.employment_status === 'ACTIVE' && ['G1', 'G2', 'G3'].includes(e.grade_id)).length },
              { name: 'Transport Allowance', desc: 'Fixed monthly transport allowance', cost: 100000, assigned: employees.filter(e => e.employment_status === 'ACTIVE').length },
            ].map((opt, i) => (
              <div key={i} className="tibbna-card mb-3">
                <div className="tibbna-card-content">
                  <div className="flex items-center gap-2 mb-2"><Car size={16} style={{ color: '#618FF5' }} /><h4 style={{ fontSize: '14px', fontWeight: 600 }}>{opt.name}</h4></div>
                  <p style={{ fontSize: '12px', color: '#525252', marginBottom: '8px' }}>{opt.desc}</p>
                  <div className="flex gap-4" style={{ fontSize: '12px' }}>
                    <span>Cost: <strong>{(opt.cost / 1000).toFixed(0)}K IQD/mo</strong></span>
                    <span>Assigned: <strong style={{ color: '#10B981' }}>{opt.assigned}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled Employees */}
      {enrollments.filter(e => e.status === 'ACTIVE').length > 0 && (
        <>
          <h3 className="tibbna-section-title tibbna-section">Assigned Employees</h3>
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="space-y-2">
                {enrollments.filter(e => e.status === 'ACTIVE').map((enr: any) => {
                  const emp = employees.find(e => e.id === enr.employee_id);
                  const plan = plans.find((p: any) => p.id === enr.plan_id);
                  return (
                    <div key={enr.id} className="flex items-center gap-3" style={{ padding: '8px', border: '1px solid #e4e4e4' }}>
                      <EmployeeAvatar name={emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'} size="sm" />
                      <div className="flex-1">
                        <p style={{ fontSize: '13px', fontWeight: 500 }}>{emp ? `${emp.first_name} ${emp.last_name}` : enr.employee_id}</p>
                        <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{plan?.name || 'Transport'} | {(enr.employer_contribution / 1000).toFixed(0)}K IQD/mo</p>
                      </div>
                      <SmartStatusBadge status={enr.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
