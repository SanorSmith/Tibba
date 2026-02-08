'use client';

import { useState } from 'react';
import { History, Download, Filter } from 'lucide-react';

export default function StockMovementsPage() {
  const [typeFilter, setTypeFilter] = useState('all');

  const mockMovements = [
    {
      id: 'TXN-001',
      date: '2026-02-08 10:30',
      type: 'DISPENSING',
      item_name: 'Paracetamol 500mg',
      quantity: -24,
      from_location: 'Main Pharmacy',
      to_location: 'Patient',
      user: 'Sarah Ahmed',
      reference: 'DISP-2026-001',
    },
    {
      id: 'TXN-002',
      date: '2026-02-08 09:15',
      type: 'TRANSFER',
      item_name: 'Epinephrine 1mg',
      quantity: -10,
      from_location: 'Main Pharmacy',
      to_location: 'ICU',
      user: 'Nurse Ahmed',
      reference: 'TRF-2026-002',
    },
    {
      id: 'TXN-003',
      date: '2026-02-08 08:00',
      type: 'RECEIPT',
      item_name: 'CBC Reagent Kit',
      quantity: 50,
      from_location: 'Supplier',
      to_location: 'Main Laboratory',
      user: 'Fatima Hassan',
      reference: 'GRN-2026-001',
    },
    {
      id: 'TXN-004',
      date: '2026-02-07 16:45',
      type: 'ADJUSTMENT',
      item_name: 'Sterile Gloves - Medium',
      quantity: -5,
      from_location: 'Central Warehouse',
      to_location: 'Wastage',
      user: 'Mohammed Ali',
      reference: 'ADJ-2026-001',
    },
  ];

  const filteredMovements = mockMovements.filter(m => 
    typeFilter === 'all' || m.type === typeFilter
  );

  const handleExport = () => {
    alert('Exporting to CSV... (Demo mode)');
  };

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Stock Movements</h2>
          <p className="page-description">Complete transaction history</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleExport}>
          <Download size={16} />
          Export to CSV
        </button>
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Total Transactions</p>
          <p className="tibbna-card-value">{mockMovements.length}</p>
          <p className="tibbna-card-subtitle">Last 7 days</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Receipts</p>
          <p className="tibbna-card-value" style={{ color: '#10B981' }}>{mockMovements.filter(m => m.type === 'RECEIPT').length}</p>
          <p className="tibbna-card-subtitle">Stock in</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Dispensing</p>
          <p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{mockMovements.filter(m => m.type === 'DISPENSING').length}</p>
          <p className="tibbna-card-subtitle">To patients</p>
        </div></div>
        <div className="tibbna-card"><div className="tibbna-card-content">
          <p className="tibbna-card-title">Transfers</p>
          <p className="tibbna-card-value" style={{ color: '#7C3AED' }}>{mockMovements.filter(m => m.type === 'TRANSFER').length}</p>
          <p className="tibbna-card-subtitle">Between locations</p>
        </div></div>
      </div>

      <div className="flex gap-2 tibbna-section" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {[{v:'all',l:'All'},{v:'RECEIPT',l:'Receipts'},{v:'DISPENSING',l:'Dispensing'},{v:'TRANSFER',l:'Transfers'},{v:'ADJUSTMENT',l:'Adjustments'}].map(f => (
          <button key={f.v} onClick={() => setTypeFilter(f.v)} className={`tibbna-tab ${typeFilter === f.v ? 'tibbna-tab-active' : ''}`}>{f.l}</button>
        ))}
      </div>

      <div className="tibbna-card">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Transaction History</h3></div>
        <div className="tibbna-card-content">
          <div className="overflow-x-auto">
            <table className="tibbna-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>From</th>
                  <th>To</th>
                  <th>User</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>{movement.date}</td>
                    <td>
                      <span className={`tibbna-badge ${
                        movement.type === 'RECEIPT' ? 'badge-success' :
                        movement.type === 'DISPENSING' ? 'badge-info' :
                        movement.type === 'TRANSFER' ? 'badge-warning' : 'badge-neutral'
                      }`}>{movement.type}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{movement.item_name}</td>
                    <td>
                      <span style={{ color: movement.quantity > 0 ? '#10B981' : '#EF4444' }}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </td>
                    <td>{movement.from_location}</td>
                    <td>{movement.to_location}</td>
                    <td>{movement.user}</td>
                    <td style={{ color: '#3B82F6' }}>{movement.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
