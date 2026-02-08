'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Package } from 'lucide-react';
import itemsData from '@/data/inventory/items.json';
import balancesData from '@/data/inventory/stock-balances.json';

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = ['all', ...new Set(itemsData.items.map(item => item.category))];

  const filteredItems = itemsData.items.filter(item => {
    const matchesSearch = 
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.generic_name && item.generic_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getItemStock = (itemId: string) => {
    const itemBalances = balancesData.balances.filter(b => b.item_id === itemId);
    return itemBalances.reduce((sum, b) => sum + b.quantity_on_hand, 0);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Item Master</h2>
          <p className="page-description">Manage inventory items and their details</p>
        </div>
        <Link href="/inventory/items/new">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add New Item
          </button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3 tibbna-section">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
          <input
            type="text"
            placeholder="Search by name, code, or generic name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tibbna-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="tibbna-select"
          style={{ width: '180px' }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="tibbna-grid">
        {filteredItems.map((item) => {
          const totalStock = getItemStock(item.id);
          const stockStatus = totalStock === 0 ? 'error' : totalStock < item.minimum_stock ? 'error' : totalStock < item.reorder_level ? 'warning' : 'success';
          const stockLabel = totalStock === 0 ? 'OUT OF STOCK' : totalStock < item.minimum_stock ? 'CRITICAL' : totalStock < item.reorder_level ? 'LOW' : 'IN STOCK';
          return (
            <Link key={item.id} href={`/inventory/items/${item.id}`}>
              <div className="tibbna-card cursor-pointer hover:shadow-md transition-shadow" style={{ height: '100%' }}>
                <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px' }}>{item.item_name}</p>
                      <p style={{ fontSize: '13px', color: '#525252', marginTop: '2px' }}>{item.item_code}</p>
                      {item.generic_name && (
                        <p style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '2px' }}>{item.generic_name}</p>
                      )}
                    </div>
                    <span className={`tibbna-badge ${item.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>Category:</span>
                    <span className="tibbna-badge badge-neutral">{item.category}</span>
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>Stock Level:</span>
                    <span className={`tibbna-badge badge-${stockStatus}`}>{stockLabel}</span>
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>On Hand:</span>
                    <span style={{ fontWeight: 500 }}>{totalStock} {item.unit_of_measure}</span>
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>Reorder Level:</span>
                    <span style={{ fontWeight: 500 }}>{item.reorder_level}</span>
                  </div>

                  <div className="flex items-center justify-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: '#525252' }}>Unit Cost:</span>
                    <span style={{ fontWeight: 500 }}>${item.unit_cost.toFixed(2)}</span>
                  </div>

                  {item.is_controlled_substance && (
                    <span className="tibbna-badge badge-error" style={{ justifyContent: 'center', width: '100%' }}>
                      Controlled Substance
                    </span>
                  )}
                  {item.is_refrigerated && (
                    <span className="tibbna-badge badge-info" style={{ justifyContent: 'center', width: '100%' }}>
                      Requires Refrigeration
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Package size={48} style={{ color: '#d4d4d4', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No items found</h3>
            <p style={{ fontSize: '14px', color: '#525252' }}>Try adjusting your search or filters</p>
          </div>
        </div>
      )}
    </>
  );
}
