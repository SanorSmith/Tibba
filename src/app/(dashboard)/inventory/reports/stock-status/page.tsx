'use client';

import { useState } from 'react';
import { Download, Printer, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockLevelIndicator } from '@/components/inventory/shared/stock-level-indicator';
import itemsData from '@/data/inventory/items.json';
import balancesData from '@/data/inventory/stock-balances.json';
import locationsData from '@/data/inventory/locations.json';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StockStatusReportPage() {
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState({
    inStock: true,
    lowStock: true,
    critical: true,
    outOfStock: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const getStockStatus = (current: number, reorder: number, minimum: number) => {
    if (current === 0) return 'OUT_OF_STOCK';
    if (current <= minimum) return 'CRITICAL';
    if (current <= reorder) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const filteredData = balancesData.balances
    .map(balance => {
      const item = itemsData.items.find(i => i.id === balance.item_id);
      const location = locationsData.locations.find(l => l.id === balance.location_id);
      if (!item || !location) return null;

      const status = getStockStatus(balance.quantity_on_hand, item.reorder_level, item.minimum_stock);
      
      return {
        ...balance,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        location_name: location.location_name,
        reorder_level: item.reorder_level,
        unit_cost: item.unit_cost,
        status,
      };
    })
    .filter(item => item !== null)
    .filter(item => {
      const matchesLocation = locationFilter === 'all' || item.location_id === locationFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = 
        (statusFilter.inStock && item.status === 'IN_STOCK') ||
        (statusFilter.lowStock && item.status === 'LOW_STOCK') ||
        (statusFilter.critical && item.status === 'CRITICAL') ||
        (statusFilter.outOfStock && item.status === 'OUT_OF_STOCK');
      
      return matchesLocation && matchesCategory && matchesStatus;
    });

  const totalItems = filteredData.length;
  const totalValue = filteredData.reduce((sum, item) => sum + (item.quantity_on_hand * item.unit_cost), 0);
  const lowStockCount = filteredData.filter(i => i.status === 'LOW_STOCK' || i.status === 'CRITICAL').length;
  const outOfStockCount = filteredData.filter(i => i.status === 'OUT_OF_STOCK').length;

  const categoryData = Object.entries(
    filteredData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.quantity_on_hand;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: 'In Stock', value: filteredData.filter(i => i.status === 'IN_STOCK').length, color: '#10b981' },
    { name: 'Low Stock', value: filteredData.filter(i => i.status === 'LOW_STOCK').length, color: '#f59e0b' },
    { name: 'Critical', value: filteredData.filter(i => i.status === 'CRITICAL').length, color: '#ef4444' },
    { name: 'Out of Stock', value: filteredData.filter(i => i.status === 'OUT_OF_STOCK').length, color: '#6b7280' },
  ];

  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleExport = (type: string) => {
    alert(`Exporting to ${type}... (Demo mode)\n\nReport would include:\n- ${totalItems} items\n- Total value: $${totalValue.toFixed(2)}\n- Generated on: ${new Date().toLocaleString()}`);
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Stock Status Report</h2>
          <p className="page-description">Current stock levels across all locations</p>
        </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('PDF')}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('Excel')}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-gray-500 mt-1">Unique items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">At cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-gray-500 mt-1">Urgent action</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Locations</option>
                {locationsData.locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.location_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="General Supplies">General Supplies</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.inStock}
                    onChange={(e) => setStatusFilter(prev => ({ ...prev, inStock: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">In Stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.lowStock}
                    onChange={(e) => setStatusFilter(prev => ({ ...prev, lowStock: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Low Stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.critical}
                    onChange={(e) => setStatusFilter(prev => ({ ...prev, critical: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Critical</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.outOfStock}
                    onChange={(e) => setStatusFilter(prev => ({ ...prev, outOfStock: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Out of Stock</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#5B7FE8" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item Code</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Location</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">On Hand</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Reserved</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Available</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Reorder</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{item.item_code}</td>
                    <td className="py-3 px-3 text-sm font-medium">{item.item_name}</td>
                    <td className="py-3 px-3 text-sm">{item.category}</td>
                    <td className="py-3 px-3 text-sm">{item.location_name}</td>
                    <td className="py-3 px-3 text-sm text-right">{item.quantity_on_hand}</td>
                    <td className="py-3 px-3 text-sm text-right">{item.quantity_reserved}</td>
                    <td className="py-3 px-3 text-sm text-right">{item.quantity_available}</td>
                    <td className="py-3 px-3 text-sm text-right">{item.reorder_level}</td>
                    <td className="py-3 px-3 text-center">
                      <StockLevelIndicator
                        current={item.quantity_on_hand}
                        reorder={item.reorder_level}
                        minimum={0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
