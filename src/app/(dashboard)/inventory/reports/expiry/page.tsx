'use client';

import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from '@/components/inventory/shared/expiry-badge';
import batchesData from '@/data/inventory/stock-batches.json';
import itemsData from '@/data/inventory/items.json';
import locationsData from '@/data/inventory/locations.json';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ExpiryReportPage() {
  const [expiryTab, setExpiryTab] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const getDaysToExpiry = (expiryDate: string) => {
    return Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredBatches = batchesData.batches
    .map(batch => {
      const item = itemsData.items.find(i => i.id === batch.item_id);
      const daysToExpiry = getDaysToExpiry(batch.expiry_date);
      
      return {
        ...batch,
        item_name: item?.item_name || 'Unknown',
        category: item?.category || 'Unknown',
        daysToExpiry,
      };
    })
    .filter(batch => {
      if (expiryTab === 'expired') return batch.daysToExpiry < 0;
      if (expiryTab === '15') return batch.daysToExpiry >= 0 && batch.daysToExpiry <= 15;
      if (expiryTab === '30') return batch.daysToExpiry > 15 && batch.daysToExpiry <= 30;
      if (expiryTab === '60') return batch.daysToExpiry > 30 && batch.daysToExpiry <= 60;
      if (expiryTab === '90') return batch.daysToExpiry > 60 && batch.daysToExpiry <= 90;
      return true;
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const totalBatches = filteredBatches.length;
  const totalValue = filteredBatches.reduce((sum, batch) => sum + (batch.received_quantity * batch.unit_cost), 0);
  const expiredCount = batchesData.batches.filter(b => getDaysToExpiry(b.expiry_date) < 0).length;
  const actionRequired = batchesData.batches.filter(b => {
    const days = getDaysToExpiry(b.expiry_date);
    return days >= 0 && days <= 30;
  }).length;

  const timelineData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() + i);
    const monthStr = month.toISOString().slice(0, 7);
    
    const count = batchesData.batches.filter(b => {
      const expMonth = b.expiry_date.slice(0, 7);
      return expMonth === monthStr;
    }).length;
    
    return {
      month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count,
    };
  });

  const tabs = [
    { id: 'all', label: 'All Batches', color: 'blue' },
    { id: 'expired', label: 'Expired', color: 'red' },
    { id: '15', label: '<15 Days', color: 'red' },
    { id: '30', label: '<30 Days', color: 'orange' },
    { id: '60', label: '<60 Days', color: 'yellow' },
    { id: '90', label: '<90 Days', color: 'green' },
  ];

  const handleAction = (action: string, batch: any) => {
    alert(`${action} action for batch ${batch.batch_number}\n\nThis would:\n- Update batch status\n- Create transaction record\n- Notify relevant staff\n\n(Demo mode)`);
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Expiry Report</h2>
          <p className="page-description">Monitor items approaching expiry</p>
        </div>
        </div>
        <Button variant="outline" onClick={() => alert('Exporting to Excel... (Demo mode)')}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Batches Expiring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatches}</div>
            <p className="text-xs text-gray-500 mt-1">In selected range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">At cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expired Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            <p className="text-xs text-gray-500 mt-1">Require disposal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{actionRequired}</div>
            <p className="text-xs text-gray-500 mt-1">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={expiryTab === tab.id ? 'default' : 'outline'}
            onClick={() => setExpiryTab(tab.id)}
            className="whitespace-nowrap"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expiry Timeline (Next 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Items Expiring" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Batch Number</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Mfg Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Expiry Date</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Days Until Expiry</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm font-medium">{batch.item_name}</td>
                    <td className="py-3 px-3 text-sm">{batch.batch_number}</td>
                    <td className="py-3 px-3 text-sm text-right">{batch.received_quantity}</td>
                    <td className="py-3 px-3 text-sm">{new Date(batch.manufacturing_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-sm">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-medium ${batch.daysToExpiry < 0 ? 'text-red-600' : batch.daysToExpiry <= 15 ? 'text-red-600' : batch.daysToExpiry <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {batch.daysToExpiry < 0 ? `Expired ${Math.abs(batch.daysToExpiry)} days ago` : `${batch.daysToExpiry} days`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ExpiryBadge expiryDate={batch.expiry_date} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" onClick={() => handleAction('Transfer', batch)}>
                          Transfer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction('Return', batch)}>
                          Return
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction('Quarantine', batch)}>
                          Quarantine
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
