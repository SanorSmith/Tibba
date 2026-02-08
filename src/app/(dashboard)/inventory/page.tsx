'use client';

import Link from 'next/link';
import { Package, AlertTriangle, DollarSign, FileText, Plus, ArrowRightLeft, ClipboardList, Pill, FlaskConical, Activity, TrendingUp, Calendar } from 'lucide-react';
import itemsData from '@/data/inventory/items.json';
import balancesData from '@/data/inventory/stock-balances.json';
import alertsData from '@/data/inventory/alerts.json';
import procurementData from '@/data/inventory/procurement.json';

export default function InventoryPage() {
  const totalItems = itemsData.items.length;
  const lowStockAlerts = alertsData.alerts.filter(a => a.alert_type === 'LOW_STOCK' || a.alert_type === 'STOCK_OUT').length;
  const expiringItems = alertsData.alerts.filter(a => a.alert_type.includes('EXPIRY')).length;
  const pendingPRs = procurementData.purchase_requisitions.filter(pr => pr.status === 'SUBMITTED').length;
  
  const totalValue = balancesData.balances.reduce((sum, balance) => {
    const item = itemsData.items.find(i => i.id === balance.item_id);
    return sum + (balance.quantity_on_hand * (item?.unit_cost || 0));
  }, 0);

  const criticalAlerts = alertsData.alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'ACTIVE');
  const highAlerts = alertsData.alerts.filter(a => a.severity === 'HIGH' && a.status === 'ACTIVE');

  const quickActions = [
    { href: '/inventory/items', icon: Package, label: 'Items' },
    { href: '/inventory/stock', icon: TrendingUp, label: 'Stock' },
    { href: '/inventory/pharmacy', icon: Pill, label: 'Pharmacy' },
    { href: '/inventory/laboratory', icon: FlaskConical, label: 'Laboratory' },
    { href: '/inventory/procurement', icon: ClipboardList, label: 'Procurement' },
    { href: '/inventory/transfers', icon: ArrowRightLeft, label: 'Transfers' },
    { href: '/inventory/alerts', icon: Activity, label: 'Alerts' },
    { href: '/inventory/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Inventory Management</h2>
          <p className="page-description">Track and manage medical supplies and equipment</p>
        </div>
        <Link href="/inventory/items/new">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add New Item
          </button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Inventory Value</p>
                <p className="tibbna-card-value">${totalValue.toLocaleString()}</p>
                <p className="tibbna-card-subtitle">{totalItems} items in stock</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <DollarSign size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Low Stock Items</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{lowStockAlerts}</p>
                <p className="tibbna-card-subtitle">Need reorder</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Expiring Soon</p>
                <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{expiringItems}</p>
                <p className="tibbna-card-subtitle">Within 30 days</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Calendar size={20} style={{ color: '#EF4444' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Pending Requisitions</p>
                <p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{pendingPRs}</p>
                <p className="tibbna-card-subtitle">Awaiting approval</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <FileText size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Alerts */}
        <div className="lg:col-span-2">
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                Active Alerts
              </h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {criticalAlerts.length === 0 && highAlerts.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#525252', textAlign: 'center', padding: '16px 0' }}>No active alerts</p>
              ) : (
                <>
                  {criticalAlerts.map(alert => (
                    <div key={alert.id} className="alert-critical flex items-start justify-between" style={{ padding: '12px', borderRadius: '0' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="tibbna-badge badge-error">CRITICAL</span>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{alert.item_name}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#525252' }}>{alert.message}</p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '2px' }}>{alert.location_name}</p>
                      </div>
                      <Link href="/inventory/alerts">
                        <button className="btn-secondary btn-sm">View</button>
                      </Link>
                    </div>
                  ))}
                  {highAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="alert-high flex items-start justify-between" style={{ padding: '12px', borderRadius: '0' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="tibbna-badge badge-warning">HIGH</span>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{alert.item_name}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#525252' }}>{alert.message}</p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '2px' }}>{alert.location_name}</p>
                      </div>
                      <Link href="/inventory/alerts">
                        <button className="btn-secondary btn-sm">View</button>
                      </Link>
                    </div>
                  ))}
                </>
              )}
              <Link href="/inventory/alerts" className="block" style={{ marginTop: '8px' }}>
                <button className="btn-secondary" style={{ width: '100%' }}>View All Alerts</button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
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
                        style={{
                          height: '72px',
                          border: '1px solid #e4e4e4',
                          borderRadius: '0',
                        }}
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
        </div>
      </div>
    </>
  );
}
