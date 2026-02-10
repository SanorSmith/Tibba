'use client';

import { useEffect, useState, useMemo } from 'react';
import { Warehouse, Search, Eye, AlertTriangle, ArrowRightLeft, Package } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { Stock, StockMovement, Warehouse as WH } from '@/types/finance';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function InventoryPage() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<WH[]>([]);
  const [tab, setTab] = useState<'stock' | 'movements' | 'warehouses'>('stock');
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { financeStore.initialize(); setStock(financeStore.getStock()); setMovements(financeStore.getStockMovements()); setWarehouses(financeStore.getWarehouses()); setMounted(true); }, []);

  const filteredStock = useMemo(() => {
    let f = stock;
    if (whFilter !== 'ALL') f = f.filter(s => s.warehouse_id === whFilter);
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.item_name_ar.includes(q)); }
    return f;
  }, [stock, search, whFilter]);

  const stats = useMemo(() => ({
    totalItems: stock.length,
    totalValue: stock.reduce((s, st) => s + st.total_value, 0),
    lowStock: stock.filter(s => s.stock_status === 'LOW_STOCK' || s.stock_status === 'OUT_OF_STOCK').length,
    warehouseCount: warehouses.length,
  }), [stock, warehouses]);

  const statusColor = (s: string) => {
    switch (s) { case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700'; case 'LOW_STOCK': return 'bg-amber-100 text-amber-700'; case 'OUT_OF_STOCK': return 'bg-red-100 text-red-700'; case 'EXPIRED': return 'bg-purple-100 text-purple-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const moveTypeColor = (t: string) => {
    switch (t) { case 'RECEIPT': return 'bg-emerald-100 text-emerald-700'; case 'ISSUE': return 'bg-red-100 text-red-700'; case 'TRANSFER': return 'bg-blue-100 text-blue-700'; case 'DISPOSAL': return 'bg-purple-100 text-purple-700'; case 'RETURN': return 'bg-amber-100 text-amber-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Inventory & Warehouse</h1><p className="text-gray-500 text-sm">Stock levels, movements, and warehouse management</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Stock Records', value: stats.totalItems, color: 'text-gray-900' },
          { label: 'Total Value', value: `${fmt(stats.totalValue)} IQD`, color: 'text-blue-600' },
          { label: 'Low Stock', value: stats.lowStock, color: 'text-amber-600' },
          { label: 'Warehouses', value: stats.warehouseCount, color: 'text-teal-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('stock')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'stock' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Stock ({stock.length})</button>
          <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'movements' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Movements ({movements.length})</button>
          <button onClick={() => setTab('warehouses')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'warehouses' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Warehouses ({warehouses.length})</button>
        </div>
        {tab === 'stock' && (
          <div className="flex gap-2">
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48" /></div>
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Warehouses</option>
              {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name_ar}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Warehouse</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">On Hand</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Available</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Reserved</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Value (IQD)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.map(s => (
                  <tr key={s.stock_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.item_name_ar}</td>
                    <td className="px-4 py-3 text-gray-600">{s.warehouse_name_ar}</td>
                    <td className="px-4 py-3 text-right">{s.quantity_on_hand}</td>
                    <td className="px-4 py-3 text-right font-medium">{s.quantity_available}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.quantity_reserved}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(s.total_value)}</td>
                    <td className="px-4 py-3 text-gray-600">{s.expiry_date || '-'}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.stock_status)}`}>{s.stock_status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
                {filteredStock.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No stock records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Movement #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...movements].sort((a, b) => b.movement_date.localeCompare(a.movement_date)).map(m => (
                  <tr key={m.movement_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{m.movement_number}</td>
                    <td className="px-4 py-3 text-gray-600">{m.movement_date}</td>
                    <td className="px-4 py-3 font-medium">{m.item_name_ar}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${moveTypeColor(m.movement_type)}`}>{m.movement_type}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{m.from_warehouse_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.to_warehouse_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{m.reason_ar || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => {
            const whStock = stock.filter(s => s.warehouse_id === w.warehouse_id);
            const whValue = whStock.reduce((s, st) => s + st.total_value, 0);
            const lowCount = whStock.filter(s => s.stock_status === 'LOW_STOCK').length;
            return (
              <div key={w.warehouse_id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">{w.warehouse_name_ar}</div>
                    {w.warehouse_name_en && <div className="text-xs text-gray-500">{w.warehouse_name_en}</div>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">{w.warehouse_type}</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">{w.warehouse_code} &middot; {w.location_ar || '-'}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded p-2"><div className="text-xs text-gray-500">Items</div><div className="font-bold">{whStock.length}</div></div>
                  <div className="bg-gray-50 rounded p-2"><div className="text-xs text-gray-500">Value</div><div className="font-bold text-xs">{fmt(whValue)}</div></div>
                  <div className="bg-gray-50 rounded p-2"><div className="text-xs text-gray-500">Low</div><div className={`font-bold ${lowCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{lowCount}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
