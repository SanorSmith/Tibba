'use client';

import { useState } from 'react';
import { Calendar, Package, AlertTriangle } from 'lucide-react';
import batchesData from '@/data/inventory/stock-batches.json';
import itemsData from '@/data/inventory/items.json';

export default function StockBatchesPage() {
  const [filterExpiry, setFilterExpiry] = useState('all');

  const filteredBatches = batchesData.batches.filter(batch => {
    if (filterExpiry === 'all') return true;
    
    const daysToExpiry = Math.floor(
      (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (filterExpiry === 'expired') return daysToExpiry < 0;
    if (filterExpiry === '30') return daysToExpiry >= 0 && daysToExpiry <= 30;
    if (filterExpiry === '60') return daysToExpiry > 30 && daysToExpiry <= 60;
    if (filterExpiry === '90') return daysToExpiry > 60 && daysToExpiry <= 90;
    
    return true;
  });

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Batch Tracking</h2>
          <p className="page-description">Monitor batches and expiry dates</p>
        </div>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Total Batches</p>
          <p className="tibbna-card-value">{batchesData.batches.length}</p>
          <p className="tibbna-card-subtitle">Active batches</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Expiring Soon</p>
          <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>
            {batchesData.batches.filter(b => {
              const days = Math.floor((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return days >= 0 && days <= 30;
            }).length}
          </p>
          <p className="tibbna-card-subtitle">Within 30 days</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Expired</p>
          <p className="tibbna-card-value" style={{ color: '#EF4444' }}>
            {batchesData.batches.filter(b => new Date(b.expiry_date) < new Date()).length}
          </p>
          <p className="tibbna-card-subtitle">Require action</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Quarantined</p>
          <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>
            {batchesData.batches.filter(b => b.is_quarantined).length}
          </p>
          <p className="tibbna-card-subtitle">On hold</p>
        </div></div>
      </div>

      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {['all', 'expired', '30', '60', '90'].map(f => (
          <button
            key={f}
            onClick={() => setFilterExpiry(f)}
            className={`tibbna-tab ${filterExpiry === f ? 'tibbna-tab-active' : ''}`}
          >
            {f === 'all' ? 'All Batches' : f === 'expired' ? 'Expired' : `${f} Days`}
          </button>
        ))}
      </div>

      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Batch List</h3></div>
        <div className="tibbna-card-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredBatches.map(batch => {
              const item = itemsData.items.find(i => i.id === batch.item_id);
              return (
                <div key={batch.id} className="flex items-center justify-between hover:bg-[#fcfcfc]" style={{ padding: '12px', border: '1px solid #e4e4e4' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} style={{ color: '#a3a3a3' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{batch.batch_number}</span>
                      {(() => {
                        const days = Math.floor((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return <span className={`tibbna-badge ${days < 0 ? 'badge-error' : days < 30 ? 'badge-warning' : 'badge-success'}`}>{days < 0 ? 'EXPIRED' : `${days} days`}</span>;
                      })()}
                      {batch.is_quarantined && <span className="tibbna-badge badge-warning">Quarantined</span>}
                      {batch.is_recalled && <span className="tibbna-badge badge-error">Recalled</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-4" style={{ fontSize: '14px' }}>
                      <div>
                        <span style={{ color: '#525252' }}>Item:</span>
                        <p style={{ fontWeight: 500 }}>{item?.item_name || 'Unknown'}</p>
                      </div>
                      <div>
                        <span style={{ color: '#525252' }}>Mfg Date:</span>
                        <p style={{ fontWeight: 500 }}>{new Date(batch.manufacturing_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span style={{ color: '#525252' }}>Expiry Date:</span>
                        <p style={{ fontWeight: 500 }}>{new Date(batch.expiry_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span style={{ color: '#525252' }}>Received Qty:</span>
                        <p style={{ fontWeight: 500 }}>{batch.received_quantity}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button className="btn-secondary btn-sm">Quarantine</button>
                    <button className="btn-secondary btn-sm">Wastage</button>
                    <button className="btn-secondary btn-sm">Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
