'use client';

import { useState } from 'react';
import { MapPin, Package, TrendingUp } from 'lucide-react';
import locationsData from '@/data/inventory/locations.json';
import balancesData from '@/data/inventory/stock-balances.json';
import itemsData from '@/data/inventory/items.json';

export default function StockLocationsPage() {
  const [selectedLocation, setSelectedLocation] = useState(locationsData.locations[0].id);

  const location = locationsData.locations.find(l => l.id === selectedLocation);
  const locationBalances = balancesData.balances.filter(b => b.location_id === selectedLocation);

  const totalValue = locationBalances.reduce((sum, balance) => {
    const item = itemsData.items.find(i => i.id === balance.item_id);
    return sum + (balance.quantity_on_hand * (item?.unit_cost || 0));
  }, 0);

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Stock by Location</h2>
          <p className="page-description">View and manage stock across all locations</p>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Selected Location</p>
          <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{location?.location_name}</p>
          <p className="tibbna-card-subtitle">{location?.location_code}</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Total Items</p>
          <p className="tibbna-card-value">{locationBalances.length}</p>
          <p className="tibbna-card-subtitle">Unique items</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Total Quantity</p>
          <p className="tibbna-card-value">{locationBalances.reduce((sum, b) => sum + b.quantity_on_hand, 0)}</p>
          <p className="tibbna-card-subtitle">Units on hand</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Total Value</p>
          <p className="tibbna-card-value">${totalValue.toLocaleString()}</p>
          <p className="tibbna-card-subtitle">At cost</p>
        </div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="tibbna-card">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Locations</h3></div>
          <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {locationsData.locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className="w-full text-left transition-colors"
                  style={{ padding: '12px', border: selectedLocation === loc.id ? '1px solid #000' : '1px solid #e4e4e4', backgroundColor: selectedLocation === loc.id ? '#f5f5f5' : '#fff' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} style={{ color: '#a3a3a3' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{loc.location_name}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#525252' }}>{loc.location_code}</p>
                  {loc.is_main_store && (
                    <span className="tibbna-badge badge-info" style={{ marginTop: '4px' }}>Main Store</span>
                  )}
                </button>
              ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <div className="flex items-center justify-between">
                <h3 className="tibbna-section-title" style={{ margin: 0 }}>Stock Items</h3>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm">Transfer</button>
                  <button className="btn-secondary btn-sm">Adjust Stock</button>
                </div>
              </div>
            </div>
            <div className="tibbna-card-content">
              <div className="space-y-2">
                {locationBalances.map(balance => {
                  const item = itemsData.items.find(i => i.id === balance.item_id);
                  if (!item) return null;

                  return (
                    <div key={balance.id} className="flex items-center justify-between hover:bg-[#fcfcfc]" style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package size={14} style={{ color: '#a3a3a3' }} />
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.item_name}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#525252' }}>{item.item_code}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div style={{ fontSize: '12px', color: '#525252' }}>On Hand</div>
                          <div style={{ fontWeight: 700 }}>{balance.quantity_on_hand}</div>
                        </div>
                        <div className="text-right">
                          <div style={{ fontSize: '12px', color: '#525252' }}>Available</div>
                          <div style={{ fontWeight: 700, color: '#10B981' }}>{balance.quantity_available}</div>
                        </div>
                        <div className="text-right">
                          <div style={{ fontSize: '12px', color: '#525252' }}>Reserved</div>
                          <div style={{ fontWeight: 700, color: '#F59E0B' }}>{balance.quantity_reserved}</div>
                        </div>
                        <span className={`tibbna-badge ${balance.quantity_on_hand === 0 ? 'badge-error' : balance.quantity_on_hand < item.minimum_stock ? 'badge-error' : balance.quantity_on_hand < item.reorder_level ? 'badge-warning' : 'badge-success'}`}>
                          {balance.quantity_on_hand === 0 ? 'OUT' : balance.quantity_on_hand < item.minimum_stock ? 'CRITICAL' : balance.quantity_on_hand < item.reorder_level ? 'LOW' : 'OK'}
                        </span>
                      </div>
                    </div>
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
