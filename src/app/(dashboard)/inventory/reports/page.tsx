'use client';

import Link from 'next/link';
import { BarChart3, TrendingUp, Clock, DollarSign, Shield, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const reportCategories = [
    {
      title: 'Operational Reports',
      icon: BarChart3,
      color: 'blue',
      reports: [
        { name: 'Stock Status Report', href: '/inventory/reports/stock-status', description: 'Current stock levels across all locations' },
        { name: 'Stock Movements', href: '/inventory/reports/movements', description: 'Transaction history and stock movements' },
        { name: 'Consumption Analysis', href: '/inventory/reports/consumption', description: 'Usage patterns by department' },
      ],
    },
    {
      title: 'Financial Reports',
      icon: DollarSign,
      color: 'green',
      reports: [
        { name: 'Inventory Valuation', href: '/inventory/reports/valuation', description: 'Total inventory value at cost' },
        { name: 'Cost of Goods Sold', href: '/inventory/reports/cogs', description: 'COGS analysis by period' },
        { name: 'Wastage Report', href: '/inventory/reports/wastage', description: 'Expired and wasted items' },
      ],
    },
    {
      title: 'Compliance Reports',
      icon: Shield,
      color: 'red',
      reports: [
        { name: 'Controlled Substances Log', href: '/inventory/reports/controlled', description: 'Complete audit trail for controlled items' },
        { name: 'Batch Traceability', href: '/inventory/reports/traceability', description: 'Track batches from receipt to consumption' },
        { name: 'Expiry Report', href: '/inventory/reports/expiry', description: 'Items expiring soon or expired' },
      ],
    },
    {
      title: 'Analytics',
      icon: TrendingUp,
      color: 'purple',
      reports: [
        { name: 'ABC Analysis', href: '/inventory/reports/abc-analysis', description: 'Item classification by value' },
        { name: 'Turnover Ratio', href: '/inventory/reports/turnover', description: 'Inventory turnover analysis' },
        { name: 'Vendor Performance', href: '/inventory/reports/vendor', description: 'Supplier performance metrics' },
      ],
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
        <h2 className="page-title">Reports & Analytics</h2>
        <p className="page-description">Generate and view inventory reports</p>
      </div>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportCategories.map(category => {
          const Icon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getColorClasses(category.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map(report => (
                    <Link key={report.name} href={report.href} className="block">
                      <div className="p-3 border rounded-lg hover:bg-gray-50 hover:border-primary transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 hover:text-primary transition-colors">{report.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          </div>
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
