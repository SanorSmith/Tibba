'use client';

import Link from 'next/link';
import { Pill, AlertTriangle, Package, Clock } from 'lucide-react';
import itemsData from '@/data/inventory/items.json';
import alertsData from '@/data/inventory/alerts.json';

export default function PharmacyPage() {
  const pharmacyItems = itemsData.items.filter(item => item.category === 'Pharmacy');
  const controlledSubstances = pharmacyItems.filter(item => item.is_controlled_substance);
  const expiringAlerts = alertsData.alerts.filter(a => a.alert_type.includes('EXPIRY'));

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Pharmacy Inventory</h2>
          <p className="page-description">Manage medications and pharmaceutical supplies</p>
        </div>
      </div>

      <div className="tibbna-grid-3 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content">
          <div className="flex items-center justify-between">
            <div><p className="tibbna-card-title">Total Medications</p><p className="tibbna-card-value">{pharmacyItems.length}</p><p className="tibbna-card-subtitle">Active medications</p></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Pill size={20} style={{ color: '#3B82F6' }} /></div>
          </div>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <div className="flex items-center justify-between">
            <div><p className="tibbna-card-title">Controlled Substances</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{controlledSubstances.length}</p><p className="tibbna-card-subtitle">Require special handling</p></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><AlertTriangle size={20} style={{ color: '#EF4444' }} /></div>
          </div>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <div className="flex items-center justify-between">
            <div><p className="tibbna-card-title">Expiring Soon</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{expiringAlerts.length}</p><p className="tibbna-card-subtitle">Within 30 days</p></div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Clock size={20} style={{ color: '#F59E0B' }} /></div>
          </div>
        </div></div>
      </div>

      <div className="tibbna-grid-2">
        {[
          { href: '/inventory/pharmacy/dispensing', icon: Pill, label: 'Medication Dispensing', desc: 'Dispense medications to patients', bg: '#DBEAFE', color: '#2563EB' },
          { href: '/inventory/pharmacy/controlled', icon: AlertTriangle, label: 'Controlled Substances', desc: 'Manage controlled medications', bg: '#FEE2E2', color: '#DC2626' },
          { href: '/inventory/pharmacy/expiry', icon: Clock, label: 'Expiry Management', desc: 'Track expiring medications', bg: '#FEF3C7', color: '#D97706' },
          { href: '/inventory/items?category=Pharmacy', icon: Package, label: 'View All Items', desc: 'Browse pharmacy inventory', bg: '#D1FAE5', color: '#059669' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow">
                <div className="tibbna-card-content">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                      <Icon size={24} style={{ color: card.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{card.label}</h3>
                      <p style={{ fontSize: '14px', color: '#525252', marginTop: '2px' }}>{card.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
