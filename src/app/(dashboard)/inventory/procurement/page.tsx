'use client';

import Link from 'next/link';
import { ClipboardList, FileText, Package, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import procurementData from '@/data/inventory/procurement.json';

export default function ProcurementPage() {
  const pendingPRs = procurementData.purchase_requisitions.filter(pr => pr.status === 'SUBMITTED').length;
  const openPOs = procurementData.purchase_orders.filter(po => po.status === 'SENT' || po.status === 'PARTIAL').length;
  const pendingGRNs = procurementData.goods_receipt_notes.filter(grn => grn.status === 'DRAFT').length;

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
        <h2 className="page-title">Procurement Management</h2>
        <p className="page-description">Manage purchase requisitions, orders, and receipts</p>
      </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending PRs</CardTitle>
            <ClipboardList className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingPRs}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open POs</CardTitle>
            <FileText className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openPOs}</div>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending GRNs</CardTitle>
            <Package className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{pendingGRNs}</div>
            <p className="text-xs text-gray-500 mt-1">To be received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Suppliers</CardTitle>
            <Users className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">5</div>
            <p className="text-xs text-gray-500 mt-1">Registered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/inventory/procurement/requisitions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <ClipboardList className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Purchase Requisitions</h3>
                  <p className="text-sm text-gray-600">Create and manage PRs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/procurement/purchase-orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Purchase Orders</h3>
                  <p className="text-sm text-gray-600">Manage POs and deliveries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/procurement/grn">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Goods Receipt</h3>
                  <p className="text-sm text-gray-600">Receive and inspect deliveries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/procurement/suppliers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Suppliers</h3>
                  <p className="text-sm text-gray-600">Manage supplier information</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Requisitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {procurementData.purchase_requisitions.map(pr => (
              <div key={pr.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{pr.pr_number}</span>
                    <Badge variant={
                      pr.status === 'APPROVED' ? 'success' :
                      pr.status === 'SUBMITTED' ? 'warning' :
                      pr.status === 'CONVERTED' ? 'info' : 'default'
                    } className="text-xs">
                      {pr.status}
                    </Badge>
                    <Badge variant={
                      pr.urgency === 'URGENT' ? 'error' :
                      pr.urgency === 'HIGH' ? 'warning' : 'secondary'
                    } className="text-xs">
                      {pr.urgency}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{pr.justification}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {pr.items.length} items • ${pr.total_amount.toFixed(2)} • Required by: {pr.required_by_date}
                  </p>
                </div>
                <Link href={`/inventory/procurement/requisitions/${pr.id}`}>
                  <Badge variant="outline" className="cursor-pointer">View</Badge>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
