'use client';

import Link from 'next/link';
import { FlaskConical, Beaker, Activity, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import itemsData from '@/data/inventory/items.json';

export default function LaboratoryPage() {
  const labItems = itemsData.items.filter(item => item.category === 'Laboratory');
  const reagents = labItems.filter(item => item.item_type === 'REAGENT');

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
        <h2 className="page-title">Laboratory Inventory</h2>
        <p className="page-description">Manage lab reagents and supplies</p>
      </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Lab Items</CardTitle>
            <FlaskConical className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labItems.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reagents</CardTitle>
            <Beaker className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reagents.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active reagents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Analyzers</CardTitle>
            <Activity className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">3</div>
            <p className="text-xs text-gray-500 mt-1">Online</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/inventory/laboratory/reagents">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Beaker className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Reagent Tracking</h3>
                  <p className="text-sm text-gray-600">Monitor reagent levels and usage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/laboratory/analyzers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Analyzer Management</h3>
                  <p className="text-sm text-gray-600">Manage lab analyzers and calibration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/items?category=Laboratory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">View All Items</h3>
                  <p className="text-sm text-gray-600">Browse laboratory inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FlaskConical className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Test Simulation</h3>
                <p className="text-sm text-gray-600">Simulate test consumption</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
