'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Package, TrendingUp, Calendar, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockLevelIndicator } from '@/components/inventory/shared/stock-level-indicator';
import { ExpiryBadge } from '@/components/inventory/shared/expiry-badge';
import itemsData from '@/data/inventory/items.json';
import balancesData from '@/data/inventory/stock-balances.json';
import batchesData from '@/data/inventory/stock-batches.json';
import locationsData from '@/data/inventory/locations.json';

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const item = itemsData.items.find(i => i.id === params.id);
  
  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Item not found</h3>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const itemBalances = balancesData.balances.filter(b => b.item_id === item.id);
  const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity_on_hand, 0);
  const totalReserved = itemBalances.reduce((sum, b) => sum + b.quantity_reserved, 0);
  const totalAvailable = itemBalances.reduce((sum, b) => sum + b.quantity_available, 0);
  const totalValue = totalStock * item.unit_cost;

  const itemBatches = batchesData.batches.filter(b => b.item_id === item.id);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'stock', label: 'Stock Levels', icon: TrendingUp },
    { id: 'batches', label: 'Batches', icon: Calendar },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-gray-500 mt-1">{item.unit_of_measure}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reserved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalReserved}</div>
            <p className="text-xs text-gray-500 mt-1">Allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">At cost</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Item Code:</span>
                <p className="font-medium">{item.item_code}</p>
              </div>
              <div>
                <span className="text-gray-600">Item Name:</span>
                <p className="font-medium">{item.item_name}</p>
              </div>
              {item.generic_name && (
                <div>
                  <span className="text-gray-600">Generic Name:</span>
                  <p className="font-medium">{item.generic_name}</p>
                </div>
              )}
              {item.brand_name && (
                <div>
                  <span className="text-gray-600">Brand Name:</span>
                  <p className="font-medium">{item.brand_name}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Category:</span>
                <p className="font-medium">{item.category}</p>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <p className="font-medium">{item.item_type}</p>
              </div>
              <div>
                <span className="text-gray-600">Unit of Measure:</span>
                <p className="font-medium">{item.unit_of_measure}</p>
              </div>
              <div>
                <span className="text-gray-600">Manufacturer:</span>
                <p className="font-medium">{item.manufacturer || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Reorder Level:</span>
                <p className="font-medium">{item.reorder_level}</p>
              </div>
              <div>
                <span className="text-gray-600">Minimum Stock:</span>
                <p className="font-medium">{item.minimum_stock}</p>
              </div>
              <div>
                <span className="text-gray-600">Maximum Stock:</span>
                <p className="font-medium">{item.maximum_stock}</p>
              </div>
              <div>
                <span className="text-gray-600">Lead Time:</span>
                <p className="font-medium">{item.lead_time_days} days</p>
              </div>
              <div>
                <span className="text-gray-600">Unit Cost:</span>
                <p className="font-medium">${item.unit_cost.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Selling Price:</span>
                <p className="font-medium">${item.selling_price.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Stock Status:</span>
                <StockLevelIndicator 
                  current={totalStock}
                  reorder={item.reorder_level}
                  minimum={item.minimum_stock}
                />
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <Badge variant={item.is_active ? 'success' : 'secondary'}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage & Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {item.is_controlled_substance && (
              <Badge variant="error" className="mr-2">Controlled Substance</Badge>
            )}
            {item.is_refrigerated && (
              <Badge variant="info" className="mr-2">Requires Refrigeration</Badge>
            )}
            {item.is_hazardous && (
              <Badge variant="warning" className="mr-2">Hazardous</Badge>
            )}
            {item.storage_conditions && (
              <div className="mt-3 text-sm">
                <p className="text-gray-600">Storage Conditions:</p>
                <p className="font-medium">Temp: {item.storage_conditions.temperature}</p>
                <p className="font-medium">Humidity: {item.storage_conditions.humidity}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {item.pharmacy_ext && (
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Drug Class:</span>
                <p className="font-medium">{item.pharmacy_ext.drug_class}</p>
              </div>
              <div>
                <span className="text-gray-600">Dosage Form:</span>
                <p className="font-medium">{item.pharmacy_ext.dosage_form}</p>
              </div>
              <div>
                <span className="text-gray-600">Strength:</span>
                <p className="font-medium">{item.pharmacy_ext.strength}</p>
              </div>
              <div>
                <span className="text-gray-600">Route:</span>
                <p className="font-medium">{item.pharmacy_ext.route_of_administration}</p>
              </div>
              {item.pharmacy_ext.is_high_alert_medication && (
                <Badge variant="error">High Alert Medication</Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderStockLevels = () => (
    <Card>
      <CardHeader>
        <CardTitle>Stock by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {itemBalances.map(balance => {
            const location = locationsData.locations.find(l => l.id === balance.location_id);
            return (
              <div key={balance.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{location?.location_name || 'Unknown'}</span>
                    {location?.is_main_store && (
                      <Badge variant="info" className="text-xs">Main Store</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{location?.location_code}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{balance.quantity_on_hand}</div>
                  <div className="text-xs text-gray-500">
                    Available: {balance.quantity_available} | Reserved: {balance.quantity_reserved}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderBatches = () => (
    <Card>
      <CardHeader>
        <CardTitle>Batch Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {itemBatches.map(batch => (
            <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{batch.batch_number}</span>
                  <ExpiryBadge expiryDate={batch.expiry_date} />
                  {batch.is_quarantined && (
                    <Badge variant="warning" className="text-xs">Quarantined</Badge>
                  )}
                  {batch.is_recalled && (
                    <Badge variant="error" className="text-xs">Recalled</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Mfg: {new Date(batch.manufacturing_date).toLocaleDateString()} | 
                  Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Received</div>
                <div className="font-medium">{batch.received_quantity} units</div>
                <div className="text-xs text-gray-500">@ ${batch.unit_cost.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTransactions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Transaction history will appear here</p>
          <p className="text-sm mt-1">Stock movements, adjustments, and consumption records</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>Item Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Quick Actions</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/inventory/items/${item.id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Item
            </Button>
            <Button variant="outline">Adjust Stock</Button>
            <Button variant="outline">Create Transfer</Button>
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">Status</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.is_active}
              readOnly
              className="w-4 h-4"
            />
            <label className="text-sm">Active Item</label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="page-header-section">
        <div>
            <h2 className="page-title">{item.item_name}</h2>
            <p className="page-description">{item.item_code}</p>
          </div>
        </div>
        </div>
        <Button onClick={() => router.push(`/inventory/items/${item.id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Item
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'stock' && renderStockLevels()}
        {activeTab === 'batches' && renderBatches()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
}
