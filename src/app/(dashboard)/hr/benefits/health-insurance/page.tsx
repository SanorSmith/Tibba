'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, DollarSign } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import benefitsData from '@/data/hr/benefits.json';
import employeesData from '@/data/hr/employees.json';

export default function HealthInsurancePage() {
  const plans = (benefitsData.benefit_plans as any[]).filter(p => p.type === 'HEALTH_INSURANCE');
  const enrollments = (benefitsData.enrollments as any[]).filter(e => {
    const plan = plans.find(p => p.id === e.plan_id);
    return !!plan;
  });

  const employees = employeesData.employees;

  const stats = useMemo(() => ({
    totalPlans: plans.length,
    totalEnrolled: enrollments.filter(e => e.status === 'ACTIVE').length,
    monthlyEmployeeCost: enrollments.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + (e.employee_contribution || 0), 0),
    monthlyEmployerCost: enrollments.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + (e.employer_contribution || 0), 0),
  }), [plans, enrollments]);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/benefits"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Health Insurance</h2>
            <p className="page-description">Health insurance plans and employee enrollments</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Plans Available</p><p className="tibbna-card-value">{stats.totalPlans}</p></div><Shield size={20} style={{ color: '#3B82F6' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Enrolled</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.totalEnrolled}</p></div><Users size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employee Cost/mo</p><p className="tibbna-card-value">{(stats.monthlyEmployeeCost / 1000).toFixed(0)}K</p><p className="tibbna-card-subtitle">IQD total</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Employer Cost/mo</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(stats.monthlyEmployerCost / 1000).toFixed(0)}K</p><p className="tibbna-card-subtitle">IQD total</p></div></div>
      </div>

      {/* Plans */}
      <h3 className="tibbna-section-title tibbna-section">Insurance Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan: any) => {
          const planEnrollments = enrollments.filter(e => e.plan_id === plan.id && e.status === 'ACTIVE');
          return (
            <div key={plan.id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={18} style={{ color: '#3B82F6' }} />
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{plan.name}</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Category</span><span style={{ fontWeight: 500 }}>{plan.category}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Employee Cost</span><span style={{ fontWeight: 500 }}>{(plan.cost_to_employee / 1000).toFixed(0)}K IQD/mo</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Employer Cost</span><span style={{ fontWeight: 500 }}>{(plan.cost_to_employer / 1000).toFixed(0)}K IQD/mo</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Enrolled</span><span style={{ fontWeight: 600, color: '#10B981' }}>{planEnrollments.length}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Status</span><SmartStatusBadge status={plan.is_active ? 'ACTIVE' : 'INACTIVE'} /></div>
                </div>
              </div>
            </div>
          );
        })}
        {plans.length === 0 && (
          <div className="col-span-full tibbna-card"><div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>No health insurance plans configured</div></div>
        )}
      </div>

      {/* Enrolled Employees */}
      <h3 className="tibbna-section-title tibbna-section">Enrolled Employees ({enrollments.filter(e => e.status === 'ACTIVE').length})</h3>
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Plan</th><th>Employee Cost</th><th>Employer Cost</th><th>Enrolled Since</th><th>Status</th></tr></thead>
              <tbody>
                {enrollments.filter(e => e.status === 'ACTIVE').map((enr: any) => {
                  const emp = employees.find(e => e.id === enr.employee_id);
                  const plan = plans.find((p: any) => p.id === enr.plan_id);
                  return (
                    <tr key={enr.id}>
                      <td className="flex items-center gap-2">
                        <EmployeeAvatar name={emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'} size="sm" />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{emp ? `${emp.first_name} ${emp.last_name}` : enr.employee_id}</span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{plan?.name || enr.plan_id}</td>
                      <td style={{ fontSize: '12px' }}>{(enr.employee_contribution / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px' }}>{(enr.employer_contribution / 1000).toFixed(0)}K</td>
                      <td style={{ fontSize: '12px' }}>{enr.enrollment_date}</td>
                      <td><SmartStatusBadge status={enr.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {enrollments.filter(e => e.status === 'ACTIVE').slice(0, 15).map((enr: any) => {
              const emp = employees.find(e => e.id === enr.employee_id);
              return (
                <div key={enr.id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{emp ? `${emp.first_name} ${emp.last_name}` : enr.employee_id}</p>
                  <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Employee: {(enr.employee_contribution / 1000).toFixed(0)}K | Employer: {(enr.employer_contribution / 1000).toFixed(0)}K</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
