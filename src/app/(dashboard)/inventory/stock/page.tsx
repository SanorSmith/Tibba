'use client';

import Link from 'next/link';
import { TrendingUp, MapPin, Package, ArrowRightLeft } from 'lucide-react';
import itemsData from '@/data/inventory/items.json';
import balancesData from '@/data/inventory/stock-balances.json';
import locationsData from '@/data/inventory/locations.json';

export default function StockPage() {
  const totalValue = balancesData.balances.reduce((sum, balance) => {
    const item = itemsData.items.find(i => i.id === balance.item_id);
    return sum + (balance.quantity_on_hand * (item?.unit_cost || 0));
  }, 0);

  const lowStockItems = balancesData.balances.filter(balance => {
    const item = itemsData.items.find(i => i.id === balance.item_id);
    return item && balance.quantity_on_hand < item.reorder_level;
  }).length;

  const navCards = [
    { href: '/inventory/stock/locations', icon: MapPin, label: 'Stock by Location', desc: 'View stock levels by location', bg: '#DBEAFE', color: '#2563EB' },
    { href: '/inventory/stock/batches', icon: Package, label: 'Batch Tracking', desc: 'Monitor batches and expiry dates', bg: '#D1FAE5', color: '#059669' },
    { href: '/inventory/stock/movements', icon: ArrowRightLeft, label: 'Stock Movements', desc: 'View transaction history', bg: '#EDE9FE', color: '#7C3AED' },
    { href: '', icon: TrendingUp, label: 'Stock Adjustment', desc: 'Adjust stock quantities', bg: '#FEF3C7', color: '#D97706' },
  ];

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Stock Management</h2>
          <p className="page-description">Monitor stock levels across all locations</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Stock Value</p>
                <p className="tibbna-card-value">${totalValue.toLocaleString()}</p>
                <p className="tibbna-card-subtitle">Across all locations</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <TrendingUp size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Locations</p>
                <p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{locationsData.locations.length}</p>
                <p className="tibbna-card-subtitle">Active locations</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <MapPin size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Low Stock Items</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{lowStockItems}</p>
                <p className="tibbna-card-subtitle">Need attention</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Package size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Stock Balances</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{balancesData.balances.length}</p>
                <p className="tibbna-card-subtitle">Active balances</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <ArrowRightLeft size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="tibbna-grid-2 tibbna-section">
        {navCards.map((card) => {
          const Icon = card.icon;
          const content = (
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
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>{content}</Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {/* Stock by Location Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>Stock by Location</h3>
        </div>
        <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {locationsData.locations.map(location => {
            const locationBalances = balancesData.balances.filter(b => b.location_id === location.id);
            const locationValue = locationBalances.reduce((sum, balance) => {
              const item = itemsData.items.find(i => i.id === balance.item_id);
              return sum + (balance.quantity_on_hand * (item?.unit_cost || 0));
            }, 0);

            return (
              <div key={location.id} className="flex items-center justify-between" style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} style={{ color: '#a3a3a3' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{location.location_name}</span>
                    {location.is_main_store && (
                      <span className="tibbna-badge badge-info">Main Store</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#525252' }}>{location.location_code}</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '2px' }}>
                    {locationBalances.length} items &bull; Value: ${locationValue.toLocaleString()}
                  </p>
                </div>
                <Link href={`/inventory/stock/locations?location=${location.id}`}>
                  <button className="btn-secondary btn-sm">View Details</button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
