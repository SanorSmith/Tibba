'use client';

import { useState } from 'react';
import { Beaker, Plus, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from '@/components/inventory/shared/expiry-badge';
import itemsData from '@/data/inventory/items.json';
import batchesData from '@/data/inventory/stock-batches.json';

export default function ReagentsPage() {
  const [showLoadLot, setShowLoadLot] = useState(false);

  const labItems = itemsData.items.filter(i => i.category === 'Laboratory' && i.item_type === 'REAGENT');

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Reagent Management</h2>
          <p className="page-description">Manage laboratory reagents and consumables</p>
        </div>
        </div>
        <Button onClick={() => setShowLoadLot(!showLoadLot)}>
          <Plus className="w-4 h-4 mr-2" />
          Load New Lot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reagents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labItems.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active reagents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">2</div>
            <p className="text-xs text-gray-500 mt-1">Need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
            <p className="text-xs text-gray-500 mt-1">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">QC Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">3</div>
            <p className="text-xs text-gray-500 mt-1">Require QC</p>
          </CardContent>
        </Card>
      </div>

      {showLoadLot && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Load New Reagent Lot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reagent</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select reagent...</option>
                  {labItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Analyzer</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select analyzer...</option>
                  <option value="ANALYZER-001">Sysmex XN-1000</option>
                  <option value="ANALYZER-002">Roche Cobas 6000</option>
                  <option value="ANALYZER-003">Abbott Architect</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
                <input type="text" placeholder="Enter lot number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Load Lot</Button>
              <Button variant="outline" onClick={() => setShowLoadLot(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labItems.map(item => {
          const itemBatches = batchesData.batches.filter(b => b.item_id === item.id);
          const latestBatch = itemBatches[0];

          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-base">{item.item_name}</CardTitle>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Code:</span>
                  <p className="font-medium">{item.item_code}</p>
                </div>
                
                {latestBatch && (
                  <>
                    <div className="text-sm">
                      <span className="text-gray-600">Current Lot:</span>
                      <p className="font-medium">{latestBatch.batch_number}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Expiry:</span>
                      <div className="mt-1">
                        <ExpiryBadge expiryDate={latestBatch.expiry_date} />
                      </div>
                    </div>
                  </>
                )}

                <div className="text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <p className="font-medium">450 tests</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">Calibrate</Button>
                  <Button size="sm" variant="outline" className="flex-1">QC</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
