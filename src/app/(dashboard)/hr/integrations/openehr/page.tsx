'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, Users, ShieldCheck, FileText, Clock, Heart, Stethoscope } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';
import employeesData from '@/data/hr/employees.json';
import departmentsData from '@/data/hr/departments.json';
import trainingData from '@/data/hr/training.json';

export default function HROpenEHRIntegrationPage() {
  const activeEmps = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const departments = departmentsData.departments;
  const clinicalDepts = departments.filter(d => d.type === 'CLINICAL');

  // Clinical staff with licenses (those who interact with openEHR clinical data)
  const clinicalStaff = activeEmps.filter(e =>
    ['MEDICAL_STAFF', 'NURSING'].includes(e.employee_category)
  );
  const licensedStaff = clinicalStaff.filter(e => e.licenses && e.licenses.length > 0);

  // Staff with expiring licenses (critical for clinical access)
  const now = new Date();
  const expiringLicenses = licensedStaff.filter(e =>
    e.licenses.some(l => {
      const exp = new Date(l.expiry);
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 90;
    })
  );

  // Training compliance for clinical staff
  const programs = trainingData.programs;
  const mandatoryPrograms = programs.filter(p => p.category === 'MANDATORY');

  // Role-based access mapping
  const accessRoles = useMemo(() => [
    { role: 'Physician', category: 'MEDICAL_STAFF', access: 'Full Clinical Read/Write', ehrModules: ['Compositions', 'Orders', 'Diagnoses', 'Prescriptions'], count: activeEmps.filter(e => e.employee_category === 'MEDICAL_STAFF' && e.job_title.includes('Physician')).length, color: '#3B82F6' },
    { role: 'Surgeon', category: 'MEDICAL_STAFF', access: 'Full Clinical Read/Write', ehrModules: ['Compositions', 'Surgical Notes', 'Orders'], count: activeEmps.filter(e => e.job_title.includes('Surgeon')).length, color: '#6366F1' },
    { role: 'Nurse', category: 'NURSING', access: 'Clinical Read + Nursing Write', ehrModules: ['Vital Signs', 'Nursing Notes', 'Medication Admin'], count: activeEmps.filter(e => e.employee_category === 'NURSING').length, color: '#EC4899' },
    { role: 'Lab Technician', category: 'TECHNICAL', access: 'Lab Results Write', ehrModules: ['Lab Results', 'Specimens'], count: activeEmps.filter(e => e.job_title.includes('Lab') || e.department_name === 'Laboratory').length, color: '#10B981' },
    { role: 'Pharmacist', category: 'MEDICAL_STAFF', access: 'Pharmacy Read/Write', ehrModules: ['Prescriptions', 'Dispensing'], count: activeEmps.filter(e => e.job_title.includes('Pharmacist') || e.department_name === 'Pharmacy').length, color: '#F59E0B' },
    { role: 'Radiologist', category: 'TECHNICAL', access: 'Imaging Read/Write', ehrModules: ['Imaging Orders', 'Radiology Reports'], count: activeEmps.filter(e => e.department_name === 'Radiology').length, color: '#8B5CF6' },
    { role: 'Administrative', category: 'ADMINISTRATIVE', access: 'Demographics Only', ehrModules: ['Patient Demographics', 'Scheduling'], count: activeEmps.filter(e => e.employee_category === 'ADMINISTRATIVE').length, color: '#6B7280' },
  ], [activeEmps]);

  const totalWithAccess = accessRoles.reduce((s, r) => s + r.count, 0);

  const pieData = accessRoles.filter(r => r.count > 0).map(r => ({
    name: r.role,
    value: r.count,
    color: r.color,
  }));

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">HR ↔ openEHR Integration</h2>
            <p className="page-description">Clinical staff access, licensing, and EHR role mapping</p>
          </div>
        </div>
        <Link href="/services"><button className="btn-secondary flex items-center gap-1"><Activity size={14} /> Clinical Services</button></Link>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Clinical Staff</p><p className="tibbna-card-value">{clinicalStaff.length}</p><p className="tibbna-card-subtitle">with EHR access</p></div><Stethoscope size={20} style={{ color: '#3B82F6' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Licensed Staff</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{licensedStaff.length}</p><p className="tibbna-card-subtitle">active licenses</p></div><ShieldCheck size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Expiring Licenses</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{expiringLicenses.length}</p><p className="tibbna-card-subtitle">within 90 days</p></div><Clock size={20} style={{ color: '#F59E0B' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Clinical Depts</p><p className="tibbna-card-value">{clinicalDepts.length}</p><p className="tibbna-card-subtitle">connected to EHR</p></div><Heart size={20} style={{ color: '#EC4899' }} /></div></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Role-Based Access Matrix */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>EHR Role-Based Access Matrix</h3></div>
            <div className="tibbna-card-content">
              <div className="hidden md:block tibbna-table-container">
                <table className="tibbna-table">
                  <thead><tr><th>Role</th><th>Staff</th><th>Access Level</th><th>EHR Modules</th></tr></thead>
                  <tbody>
                    {accessRoles.map(r => (
                      <tr key={r.role}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.role}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{r.count}</td>
                        <td style={{ fontSize: '12px' }}>{r.access}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {r.ehrModules.map(m => (
                              <span key={m} className="tibbna-badge" style={{ fontSize: '9px', backgroundColor: '#f3f4f6', color: '#525252' }}>{m}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {accessRoles.map(r => (
                  <div key={r.role} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.role}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.count}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#525252' }}>{r.access}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.ehrModules.map(m => (
                        <span key={m} className="tibbna-badge" style={{ fontSize: '9px', backgroundColor: '#f3f4f6', color: '#525252' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expiring Licenses Alert */}
          {expiringLicenses.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header">
                <h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}>
                  <Clock size={16} style={{ color: '#F59E0B' }} /> Expiring Licenses — EHR Access at Risk
                </h3>
              </div>
              <div className="tibbna-card-content">
                <div style={{ padding: '8px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: '12px', fontSize: '12px', color: '#92400E' }}>
                  Staff with expiring licenses may lose clinical EHR access. Ensure renewals are processed promptly.
                </div>
                <div className="space-y-2">
                  {expiringLicenses.map(e => {
                    const expLicense = e.licenses.find(l => {
                      const diff = (new Date(l.expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                      return diff > 0 && diff <= 90;
                    });
                    const daysLeft = expLicense ? Math.ceil((new Date(expLicense.expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    return (
                      <div key={e.id} className="flex items-center gap-3" style={{ padding: '8px', border: '1px solid #e4e4e4' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7', fontSize: '10px', fontWeight: 600, color: '#92400E' }}>
                          {e.first_name[0]}{e.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <Link href={`/hr/employees/${e.id}`} className="hover:underline">
                            <p style={{ fontSize: '13px', fontWeight: 600 }}>{e.first_name} {e.last_name}</p>
                          </Link>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.job_title} | {expLicense?.type}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="tibbna-badge badge-warning" style={{ fontSize: '10px' }}>{daysLeft}d left</span>
                          <p style={{ fontSize: '10px', color: '#a3a3a3' }}>Exp: {expLicense?.expiry}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Training Compliance */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Mandatory Training for EHR Access</h3></div>
            <div className="tibbna-card-content">
              <p style={{ fontSize: '12px', color: '#525252', marginBottom: '12px' }}>
                Clinical staff must complete mandatory training programs to maintain EHR access privileges.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mandatoryPrograms.map(p => (
                  <div key={p.id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{p.type} | {p.duration_hours}h | CME: {p.cme_credits || 0}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <SmartStatusBadge status={p.is_active ? 'ACTIVE' : 'INACTIVE'} />
                      <span style={{ fontSize: '10px', color: '#525252' }}>Required for clinical access</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Staff Distribution Chart */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>EHR Access by Role</h3></div>
            <div className="tibbna-card-content">
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                      {pieData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} staff`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between" style={{ fontSize: '11px' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* openEHR Connection Status */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>openEHR Connection</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Server</span><SmartStatusBadge status="ACTIVE" /></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>API Version</span><span style={{ fontWeight: 500 }}>openEHR REST v1.0</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Templates</span><span style={{ fontWeight: 500 }}>12 active</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Archetypes</span><span style={{ fontWeight: 500 }}>48 loaded</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Last Sync</span><span style={{ fontWeight: 500 }}>2 min ago</span></div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Quick Links</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Link href="/hr/employees" style={{ fontSize: '13px', color: '#618FF5' }}>→ Employee Directory</Link>
              <Link href="/hr/training" style={{ fontSize: '13px', color: '#618FF5' }}>→ Training Programs</Link>
              <Link href="/services" style={{ fontSize: '13px', color: '#618FF5' }}>→ Clinical Services</Link>
              <Link href="/hr/organization" style={{ fontSize: '13px', color: '#618FF5' }}>→ Organization Chart</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
