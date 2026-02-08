'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Users, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import employeesData from '@/data/hr/employees.json';
import departmentsData from '@/data/hr/departments.json';
import inventoryItems from '@/data/inventory/items.json';
import consumptionData from '@/data/inventory/consumption-report.json';
import alertsData from '@/data/inventory/alerts.json';

export default function HRInventoryIntegrationPage() {
  const activeEmps = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const departments = departmentsData.departments;
  const items = inventoryItems.items;
  const consumption = consumptionData.consumption_records;
  const alerts = (alertsData as any).alerts || [];

  // Department consumption analysis
  const deptConsumption = useMemo(() => {
    const map: Record<string, { dept: string; totalCost: number; items: number; employees: number }> = {};
    consumption.forEach((c: any) => {
      const dept = c.department;
      if (!map[dept]) {
        const deptEmps = activeEmps.filter(e => e.department_name === dept).length;
        map[dept] = { dept, totalCost: 0, items: 0, employees: deptEmps };
      }
      map[dept].totalCost += c.total_cost || 0;
      map[dept].items++;
    });
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [consumption, activeEmps]);

  // Staff with access to controlled substances
  const controlledItems = items.filter(i => i.is_controlled_substance);
  const pharmacyStaff = activeEmps.filter(e =>
    e.department_name === 'Pharmacy' || e.employee_category === 'MEDICAL_STAFF'
  );

  // PPE allocation per employee
  const ppeItems = items.filter(i => i.category === 'Medical Supplies' || i.subcategory?.includes('PPE') || i.item_name.toLowerCase().includes('glove') || i.item_name.toLowerCase().includes('mask') || i.item_name.toLowerCase().includes('gown'));

  // Departments needing equipment
  const clinicalDepts = departments.filter(d => d.type === 'CLINICAL');

  const chartData = deptConsumption.slice(0, 8).map(d => ({
    name: d.dept.length > 12 ? d.dept.substring(0, 12) + '...' : d.dept,
    cost: Math.round(d.totalCost * 100) / 100,
    perEmployee: d.employees > 0 ? Math.round((d.totalCost / d.employees) * 100) / 100 : 0,
  }));

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">HR ↔ Inventory Integration</h2>
            <p className="page-description">Cross-module insights: staffing, consumption, and resource allocation</p>
          </div>
        </div>
        <Link href="/inventory"><button className="btn-secondary flex items-center gap-1"><Package size={14} /> Go to Inventory</button></Link>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Active Staff</p><p className="tibbna-card-value">{activeEmps.length}</p></div><Users size={20} style={{ color: '#3B82F6' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Inventory Items</p><p className="tibbna-card-value">{items.length}</p></div><Package size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Controlled Items</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{controlledItems.length}</p></div><ShieldCheck size={20} style={{ color: '#EF4444' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Active Alerts</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{alerts.length}</p></div><AlertTriangle size={20} style={{ color: '#F59E0B' }} /></div></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Department Consumption Chart */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><TrendingUp size={16} /> Consumption by Department</h3></div>
            <div className="tibbna-card-content">
              {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
                      <Bar dataKey="cost" fill="#618FF5" name="Total Cost" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '32px' }}>No consumption data available</p>
              )}
            </div>
          </div>

          {/* Department Resource Table */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Department Resource Allocation</h3></div>
            <div className="tibbna-card-content">
              <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tibbna-table">
                  <thead><tr><th>Department</th><th>Staff</th><th>Consumption Items</th><th>Total Cost</th><th>Cost/Employee</th></tr></thead>
                  <tbody>
                    {deptConsumption.map(d => (
                      <tr key={d.dept}>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{d.dept}</td>
                        <td style={{ fontSize: '13px' }}>{d.employees}</td>
                        <td style={{ fontSize: '13px' }}>{d.items}</td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>${d.totalCost.toFixed(2)}</td>
                        <td style={{ fontSize: '13px', color: '#618FF5' }}>{d.employees > 0 ? `$${(d.totalCost / d.employees).toFixed(2)}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-2">
                {deptConsumption.map(d => (
                  <div key={d.dept} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{d.dept}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>${d.totalCost.toFixed(2)}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{d.employees} staff | {d.items} items | ${d.employees > 0 ? (d.totalCost / d.employees).toFixed(2) : '0'}/emp</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Controlled Substance Access */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><ShieldCheck size={16} style={{ color: '#EF4444' }} /> Controlled Substance Access</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Controlled Items</span><span style={{ fontWeight: 600 }}>{controlledItems.length}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Authorized Staff</span><span style={{ fontWeight: 600 }}>{pharmacyStaff.length}</span></div>
              <div style={{ borderTop: '1px solid #e4e4e4', paddingTop: '8px' }}>
                <p style={{ fontSize: '11px', color: '#a3a3a3', marginBottom: '6px' }}>Authorized Personnel:</p>
                {pharmacyStaff.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE', fontSize: '9px', fontWeight: 600, color: '#3B82F6' }}>
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 500 }}>{s.first_name} {s.last_name}</p>
                      <p style={{ fontSize: '10px', color: '#a3a3a3' }}>{s.job_title}</p>
                    </div>
                  </div>
                ))}
                {pharmacyStaff.length > 5 && <p style={{ fontSize: '11px', color: '#618FF5' }}>+{pharmacyStaff.length - 5} more</p>}
              </div>
            </div>
          </div>

          {/* PPE Summary */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>PPE & Safety Items</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>PPE Items Tracked</span><span style={{ fontWeight: 600 }}>{ppeItems.length}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Clinical Departments</span><span style={{ fontWeight: 600 }}>{clinicalDepts.length}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Staff Requiring PPE</span><span style={{ fontWeight: 600 }}>{activeEmps.filter(e => ['MEDICAL_STAFF', 'NURSING', 'TECHNICAL'].includes(e.employee_category)).length}</span></div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Quick Links</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Link href="/inventory/items" style={{ fontSize: '13px', color: '#618FF5' }}>→ Inventory Items</Link>
              <Link href="/inventory/consumption" style={{ fontSize: '13px', color: '#618FF5' }}>→ Consumption Report</Link>
              <Link href="/inventory/alerts" style={{ fontSize: '13px', color: '#618FF5' }}>→ Inventory Alerts</Link>
              <Link href="/hr/employees" style={{ fontSize: '13px', color: '#618FF5' }}>→ Employee Directory</Link>
              <Link href="/hr/organization" style={{ fontSize: '13px', color: '#618FF5' }}>→ Organization Chart</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
