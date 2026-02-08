'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import alertsData from '@/data/inventory/alerts.json';

export default function AlertsPage() {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alerts, setAlerts] = useState(alertsData.alerts);
  const [showDismissConfirm, setShowDismissConfirm] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'ACKNOWLEDGED', acknowledged_by: 'Current User', acknowledged_at: new Date().toISOString() } as any
        : alert
    ));
    alert('Alert acknowledged successfully!');
  };

  const handleTakeAction = (alertItem: any) => {
    switch (alertItem.alert_type) {
      case 'LOW_STOCK':
        router.push(`/inventory/procurement/requisitions/new?item_id=${alertItem.item_id}&prefill=true`);
        break;
      case 'STOCK_OUT':
        router.push(`/inventory/procurement/requisitions/new?item_id=${alertItem.item_id}&urgent=true`);
        break;
      case 'EXPIRY_30_DAYS':
      case 'EXPIRY_15_DAYS':
      case 'EXPIRED':
        router.push(`/inventory/stock/batches?batch_id=${alertItem.batch_number}`);
        break;
      case 'CONTROLLED_SUBSTANCE_DISCREPANCY':
        router.push('/inventory/pharmacy/controlled');
        break;
      default:
        alert(`Action handler for ${alertItem.alert_type} - Navigate to appropriate page`);
    }
  };

  const handleDismiss = (alertId: string) => {
    if (showDismissConfirm === alertId) {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setShowDismissConfirm(null);
      alert('Alert dismissed successfully!');
    } else {
      setShowDismissConfirm(alertId);
    }
  };

  const handleViewDetails = (alertItem: any) => {
    if (alertItem.item_id) {
      router.push(`/inventory/items/${alertItem.item_id}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-50 border-red-200';
      case 'HIGH': return 'bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'bg-blue-50 border-blue-200';
      case 'LOW': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return 'Low Stock';
      case 'STOCK_OUT': return 'Stock Out';
      case 'EXPIRY_30_DAYS': return 'Expiring Soon';
      case 'EXPIRY_15_DAYS': return 'Expiring Very Soon';
      case 'EXPIRED': return 'Expired';
      case 'OVERSTOCK': return 'Overstock';
      case 'TEMPERATURE': return 'Temperature Excursion';
      case 'CONTROLLED_SUBSTANCE_DISCREPANCY': return 'Controlled Substance Issue';
      case 'PENDING_APPROVAL': return 'Pending Approval';
      default: return type;
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH' && a.status === 'ACTIVE').length;
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
        <h2 className="page-title">Inventory Alerts</h2>
        <p className="page-description">Monitor and manage inventory alerts and notifications</p>
      </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Critical Alerts</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highCount}</div>
            <p className="text-xs text-gray-500 mt-1">Need attention soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Active</CardTitle>
            <AlertTriangle className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
            <p className="text-xs text-gray-500 mt-1">All active alerts</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredAlerts.map(alert => (
          <Card key={alert.id} className={`border ${getSeverityBgColor(alert.severity)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getAlertTypeLabel(alert.alert_type)}
                    </Badge>
                    <Badge variant={alert.status === 'ACTIVE' ? 'error' : 'secondary'} className="text-xs">
                      {alert.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{alert.item_name}</h3>
                  <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    {alert.location_name && (
                      <div>
                        <span className="font-medium">Location:</span> {alert.location_name}
                      </div>
                    )}
                    {alert.current_stock !== undefined && (
                      <div>
                        <span className="font-medium">Current Stock:</span> {alert.current_stock}
                      </div>
                    )}
                    {alert.reorder_level !== undefined && (
                      <div>
                        <span className="font-medium">Reorder Level:</span> {alert.reorder_level}
                      </div>
                    )}
                    {alert.days_to_expiry !== undefined && (
                      <div>
                        <span className="font-medium">Days to Expiry:</span> {alert.days_to_expiry}
                      </div>
                    )}
                    {alert.batch_number && (
                      <div>
                        <span className="font-medium">Batch:</span> {alert.batch_number}
                      </div>
                    )}
                    {alert.quantity !== undefined && (
                      <div>
                        <span className="font-medium">Quantity:</span> {alert.quantity}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Created: {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {alert.status === 'ACTIVE' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                      <Button size="sm" onClick={() => handleTakeAction(alert)}>
                        Take Action
                      </Button>
                    </>
                  )}
                  {alert.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => handleTakeAction(alert)}>
                      Review
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(alert)}>
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    variant={showDismissConfirm === alert.id ? "destructive" : "outline"}
                    onClick={() => handleDismiss(alert.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {showDismissConfirm === alert.id ? 'Confirm?' : 'Dismiss'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-600">All clear! No alerts match your current filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
