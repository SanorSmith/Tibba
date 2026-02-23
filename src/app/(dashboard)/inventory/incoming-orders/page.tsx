'use client';

import { useEffect, useState } from 'react';
import { Package, Search, Eye, X, CheckCircle, Clock, Truck, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import type { InternalOrder, OrderStatus, UpdateOrderStatusRequest } from '@/types/internal-orders';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-purple-100 text-purple-800',
  SENT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<OrderStatus, any> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  PACKED: Package,
  SENT: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: AlertCircle,
};

export default function IncomingOrdersPage() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [modal, setModal] = useState<'view' | 'update' | null>(null);
  const [currentOrder, setCurrentOrder] = useState<InternalOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // Update status form
  const [newStatus, setNewStatus] = useState<OrderStatus>('PENDING');
  const [staffName, setStaffName] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/internal-orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const handleUpdateStatus = async () => {
    if (!currentOrder || !staffName) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const updateData: UpdateOrderStatusRequest = {
        order_id: currentOrder.id,
        new_status: newStatus,
        changed_by: staffName,
        notes: statusNotes,
      };

      if (newStatus === 'APPROVED') {
        updateData.approved_by = staffName;
      } else if (newStatus === 'PACKED') {
        updateData.packed_by = staffName;
      } else if (newStatus === 'SENT') {
        updateData.sent_by = staffName;
      } else if (newStatus === 'DELIVERED') {
        updateData.delivered_to = receiverName || staffName;
        updateData.delivery_notes = deliveryNotes;
      }

      const res = await fetch('/api/internal-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success('Order status updated successfully');
        setModal(null);
        resetUpdateForm();
        loadOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const resetUpdateForm = () => {
    setNewStatus('PENDING');
    setStaffName('');
    setStatusNotes('');
    setReceiverName('');
    setDeliveryNotes('');
  };

  const openUpdateModal = (order: InternalOrder) => {
    setCurrentOrder(order);
    
    // Set next logical status
    const statusFlow: Record<OrderStatus, OrderStatus> = {
      PENDING: 'APPROVED',
      APPROVED: 'PACKED',
      PACKED: 'SENT',
      SENT: 'DELIVERED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };
    
    setNewStatus(statusFlow[order.status]);
    setModal('update');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
                         order.department_name.toLowerCase().includes(search.toLowerCase()) ||
                         order.requested_by.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: orders.filter(o => o.status === 'PENDING').length,
    approved: orders.filter(o => o.status === 'APPROVED').length,
    packed: orders.filter(o => o.status === 'PACKED').length,
    sent: orders.filter(o => o.status === 'SENT').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#151515]">Incoming Orders</h1>
        <p className="text-gray-600 mt-1">Manage and track department orders from inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packed</p>
              <p className="text-2xl font-bold text-purple-600">{stats.packed}</p>
            </div>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.sent}</p>
            </div>
            <Truck className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PACKED">Packed</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requested By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const StatusIcon = STATUS_ICONS[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.department_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.requested_by}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.total_items} items</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                        order.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.status]}`}>
                        <StatusIcon size={12} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrentOrder(order);
                            setModal('view');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openUpdateModal(order)}
                            className="text-green-600 hover:text-green-800"
                            title="Update Status"
                          >
                            <Package size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Modal */}
      {modal === 'view' && currentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details - {currentOrder.order_number}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-semibold">{currentOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[currentOrder.status]}`}>
                    {currentOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold">{currentOrder.department_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    currentOrder.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    currentOrder.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {currentOrder.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested By</p>
                  <p className="font-semibold">{currentOrder.requested_by}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{new Date(currentOrder.order_date).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Delivery Location</p>
                  <p className="font-semibold">{currentOrder.delivery_location}</p>
                </div>
                {currentOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-sm bg-gray-50 p-3 rounded">{currentOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              {currentOrder.items && currentOrder.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Code</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Category</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentOrder.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm font-mono">{item.item_code}</td>
                            <td className="px-4 py-2 text-sm">{item.item_name}</td>
                            <td className="px-4 py-2 text-sm">{item.category}</td>
                            <td className="px-4 py-2 text-sm">{item.quantity_requested} {item.unit_of_measure}</td>
                            <td className="px-4 py-2 text-sm">{fmt(item.unit_price)} IQD</td>
                            <td className="px-4 py-2 text-sm font-medium">{fmt(item.total_price)} IQD</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right font-semibold">Total:</td>
                          <td className="px-4 py-2 font-bold text-blue-600">{fmt(currentOrder.estimated_cost)} IQD</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Tracking Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Tracking Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentOrder.order_date ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Clock size={16} className={currentOrder.order_date ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Order Created</p>
                      <p className="text-xs text-gray-600">{new Date(currentOrder.order_date).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">By {currentOrder.requested_by}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentOrder.approved_at ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle size={16} className={currentOrder.approved_at ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Approved</p>
                      {currentOrder.approved_at ? (
                        <>
                          <p className="text-xs text-gray-600">{new Date(currentOrder.approved_at).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">By {currentOrder.approved_by}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Pending approval</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentOrder.packed_at ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Package size={16} className={currentOrder.packed_at ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Packed</p>
                      {currentOrder.packed_at ? (
                        <>
                          <p className="text-xs text-gray-600">{new Date(currentOrder.packed_at).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">By {currentOrder.packed_by}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Not yet packed</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentOrder.sent_at ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Truck size={16} className={currentOrder.sent_at ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Sent for Delivery</p>
                      {currentOrder.sent_at ? (
                        <>
                          <p className="text-xs text-gray-600">{new Date(currentOrder.sent_at).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">By {currentOrder.sent_by}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Not yet sent</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentOrder.delivered_at ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle size={16} className={currentOrder.delivered_at ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Delivered</p>
                      {currentOrder.delivered_at ? (
                        <>
                          <p className="text-xs text-gray-600">{new Date(currentOrder.delivered_at).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Received by {currentOrder.delivered_to}</p>
                          {currentOrder.delivery_notes && (
                            <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">{currentOrder.delivery_notes}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Not yet delivered</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                {currentOrder.status !== 'DELIVERED' && currentOrder.status !== 'CANCELLED' && (
                  <button
                    onClick={() => {
                      setModal(null);
                      openUpdateModal(currentOrder);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {modal === 'update' && currentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Update Order Status</h2>
              <button onClick={() => { setModal(null); resetUpdateForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Order: <span className="font-semibold">{currentOrder.order_number}</span></p>
                <p className="text-sm text-gray-600">Current Status: <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[currentOrder.status]}`}>
                  {currentOrder.status}
                </span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PACKED">Packed</option>
                  <option value="SENT">Sent</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (Staff) *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {newStatus === 'DELIVERED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name at Department *</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Name of person receiving the order"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newStatus === 'DELIVERED' ? 'Delivery Notes' : 'Notes'}
                </label>
                <textarea
                  value={newStatus === 'DELIVERED' ? deliveryNotes : statusNotes}
                  onChange={(e) => newStatus === 'DELIVERED' ? setDeliveryNotes(e.target.value) : setStatusNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes or comments"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setModal(null); resetUpdateForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={loading || !staffName || (newStatus === 'DELIVERED' && !receiverName)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
