'use client';

import { useState } from 'react';
import { Users, Star, TrendingUp, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import suppliersData from '@/data/inventory/suppliers.json';

export default function SuppliersPage() {
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Supplier Management</h2>
          <p className="page-description">Manage supplier information and performance</p>
        </div>
        </div>
        <Button onClick={() => setShowAddSupplier(!showAddSupplier)}>
          <Users className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliersData.suppliers.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(suppliersData.suppliers.reduce((sum, s) => sum + s.performance_rating, 0) / suppliersData.suppliers.length).toFixed(1)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">95%</div>
            <p className="text-xs text-gray-500 mt-1">Average rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">4.5</div>
            <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
          </CardContent>
        </Card>
      </div>

      {showAddSupplier && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Add New Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input type="text" placeholder="Enter name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input type="text" placeholder="Enter contact name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="email@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" placeholder="+971 XX XXX XXXX" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Add Supplier</Button>
              <Button variant="outline" onClick={() => setShowAddSupplier(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliersData.suppliers.map(supplier => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-base">{supplier.supplier_name}</CardTitle>
                </div>
                <Badge variant={supplier.is_active ? 'success' : 'secondary'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-600">Contact Person:</span>
                <p className="font-medium">{supplier.contact_person}</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{supplier.email}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{supplier.phone}</span>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Performance Rating:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{supplier.performance_rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">On-Time Delivery:</span>
                  <span className="font-medium text-green-600">95%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quality Rating:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">4.5</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">View Details</Button>
                <Button size="sm" variant="outline" className="flex-1">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
