'use client';

import { Building2, Users, MapPin, Phone } from 'lucide-react';
import departmentsData from '@/data/hr/departments.json';
import employeesData from '@/data/hr/employees.json';

const typeColors: Record<string, { bg: string; text: string }> = {
  CLINICAL: { bg: '#DBEAFE', text: '#1D4ED8' },
  ADMINISTRATIVE: { bg: '#E0E7FF', text: '#4338CA' },
  SUPPORT: { bg: '#FEF3C7', text: '#92400E' },
};

export default function OrganizationPage() {
  const departments = departmentsData.departments;
  const clinical = departments.filter(d => d.type === 'CLINICAL');
  const admin = departments.filter(d => d.type === 'ADMINISTRATIVE');
  const support = departments.filter(d => d.type === 'SUPPORT');

  const getHeadcount = (deptId: string) => employeesData.employees.filter(e => e.department_id === deptId && e.employment_status === 'ACTIVE').length;
  const getHead = (empId: string) => employeesData.employees.find(e => e.id === empId);

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Organizational Structure</h2>
          <p className="page-description">{departments.length} departments across the hospital</p>
        </div>
      </div>

      <div className="tibbna-grid-3 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Clinical Departments</p><p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{clinical.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Building2 size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Administrative</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{admin.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><Building2 size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Support Services</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{support.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Building2 size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
      </div>

      {/* Department Groups */}
      {[
        { title: 'Clinical Departments', depts: clinical, color: '#3B82F6' },
        { title: 'Administrative Departments', depts: admin, color: '#6366F1' },
        { title: 'Support Services', depts: support, color: '#F59E0B' },
      ].map(group => (
        <div key={group.title} className="tibbna-section">
          <h3 className="tibbna-section-title" style={{ marginBottom: '12px' }}>{group.title}</h3>
          <div className="tibbna-grid-3">
            {group.depts.map(dept => {
              const headcount = getHeadcount(dept.id);
              const head = getHead(dept.head_employee_id);
              const tc = typeColors[dept.type] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <div key={dept.id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{dept.name}</h4>
                        <p style={{ fontSize: '12px', color: '#a3a3a3', direction: 'rtl' }}>{dept.name_arabic}</p>
                      </div>
                      <span className="tibbna-badge" style={{ backgroundColor: tc.bg, color: tc.text, fontSize: '10px' }}>{dept.type}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#525252', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex items-center gap-2"><Users size={12} /> <span>{headcount} staff</span></div>
                      <div className="flex items-center gap-2"><MapPin size={12} /> <span>{dept.location}</span></div>
                      <div className="flex items-center gap-2"><Phone size={12} /> <span>Ext. {dept.phone_ext}</span></div>
                      {head && (
                        <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Department Head</p>
                          <p style={{ fontSize: '13px', fontWeight: 500 }}>{head.first_name} {head.last_name}</p>
                          <p style={{ fontSize: '11px', color: '#525252' }}>{head.job_title}</p>
                        </div>
                      )}
                      <div className="flex justify-between mt-2" style={{ fontSize: '11px', color: '#a3a3a3' }}>
                        <span>Budget: {(dept.budget_annual / 1000000000).toFixed(1)}B IQD</span>
                        <span>Code: {dept.code}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
