'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, Eye, X, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { InternalOrder, CreateOrderRequest, OrderPriority, OrderStatus } from '@/types/internal-orders';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

const PRIORITY_COLORS: Record<OrderPriority, string> = {
  URGENT: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
};

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
  SENT: Package,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  unit_price: number;
  quantity_in_stock: number;
  unit_of_measure: string;
}

interface OrderItem {
  item_id: string;
  item_code: string;
  item_name: string;
  item_description?: string;
  category: string;
  quantity_requested: number;
  unit_of_measure: string;
  unit_price: number;
}

interface StaffMember {
  staff_id: string;
  staff_name: string;
  staff_email?: string;
  staff_phone?: string;
  department_id: string;
  department_name: string;
  position?: string;
  is_active: boolean;
}

interface Department {
  department_id: string;
  department_name: string;
  department_name_ar?: string;
  location?: string;
  manager_name?: string;
  is_active: boolean;
}

export default function DepartmentOrdersPage() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [modal, setModal] = useState<'create' | 'view' | null>(null);
  const [currentOrder, setCurrentOrder] = useState<InternalOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // New order form state
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestedByEmail, setRequestedByEmail] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  
  // Search states
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffResults, setShowStaffResults] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    loadOrders();
    loadInventoryItems();
    loadDepartments();
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

  const loadInventoryItems = async () => {
    try {
      // This would connect to your inventory API
      // For now, using mock data
      const mockItems: InventoryItem[] = [
        { id: '1', item_code: 'MED-001', item_name: 'Paracetamol 500mg', category: 'Medication', unit_price: 0.50, quantity_in_stock: 1000, unit_of_measure: 'tablet' },
        { id: '2', item_code: 'SUP-045', item_name: 'Surgical Gloves (Box)', category: 'Supplies', unit_price: 15.00, quantity_in_stock: 200, unit_of_measure: 'box' },
        { id: '3', item_code: 'MED-015', item_name: 'Ibuprofen 400mg', category: 'Medication', unit_price: 0.75, quantity_in_stock: 800, unit_of_measure: 'tablet' },
        { id: '4', item_code: 'SUP-012', item_name: 'Syringes 5ml (Pack)', category: 'Supplies', unit_price: 8.00, quantity_in_stock: 150, unit_of_measure: 'pack' },
        { id: '5', item_code: 'EQP-003', item_name: 'Blood Pressure Monitor', category: 'Equipment', unit_price: 250.00, quantity_in_stock: 10, unit_of_measure: 'unit' },
      ];
      setInventoryItems(mockItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await fetch('/api/openehr/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const searchStaff = async (query: string) => {
    if (!query) {
      setStaff([]);
      setShowStaffResults(false);
      return;
    }

    try {
      const res = await fetch(`/api/openehr/staff?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
        setShowStaffResults(true);
      }
    } catch (error) {
      console.error('Error searching staff:', error);
    }
  };

  const handleStaffSelect = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setRequestedBy(staffMember.staff_name);
    setRequestedByEmail(staffMember.staff_email || '');
    setDepartmentId(staffMember.department_id);
    setDepartmentName(staffMember.department_name);
    setDeliveryLocation(staffMember.department_name);
    setStaffSearch(staffMember.staff_name);
    setShowStaffResults(false);
  };

  const handleCreateOrder = async () => {
    if (!requestedBy || !deliveryLocation || orderItems.length === 0) {
      toast.error('Please fill all required fields and add at least one item');
      return;
    }

    setLoading(true);
    try {
      const orderData: CreateOrderRequest = {
        department_id: departmentId,
        department_name: departmentName,
        requested_by: requestedBy,
        requested_by_email: requestedByEmail,
        delivery_location: deliveryLocation,
        priority,
        notes,
        items: orderItems.map(item => ({
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_description: item.item_description,
          category: item.category,
          quantity_requested: item.quantity_requested,
          unit_of_measure: item.unit_of_measure,
          unit_price: item.unit_price,
        })),
      };

      const res = await fetch('/api/internal-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        toast.success('Order created successfully');
        setModal(null);
        resetForm();
        loadOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestedBy('');
    setRequestedByEmail('');
    setDepartmentId('');
    setDepartmentName('');
    setDeliveryLocation('');
    setPriority('NORMAL');
    setNotes('');
    setOrderItems([]);
    setItemSearch('');
    setStaffSearch('');
    setSelectedStaff(null);
    setShowStaffResults(false);
  };

  // Debounced staff search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (staffSearch && staffSearch.length >= 2) {
        searchStaff(staffSearch);
      } else {
        setStaff([]);
        setShowStaffResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [staffSearch]);

  const addItemToOrder = (item: InventoryItem) => {
    const existing = orderItems.find(oi => oi.item_id === item.id);
    if (existing) {
      setOrderItems(orderItems.map(oi =>
        oi.item_id === item.id
          ? { ...oi, quantity_requested: oi.quantity_requested + 1 }
          : oi
      ));
    } else {
      setOrderItems([...orderItems, {
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        item_description: item.description,
        category: item.category,
        quantity_requested: 1,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price,
      }]);
    }
    setItemSearch('');
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(oi => oi.item_id !== itemId));
    } else {
      setOrderItems(orderItems.map(oi =>
        oi.item_id === itemId ? { ...oi, quantity_requested: quantity } : oi
      ));
    }
  };

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter(oi => oi.item_id !== itemId));
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
                         order.requested_by.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInventory = inventoryItems.filter(item =>
    item.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.item_code.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const totalOrderValue = orderItems.reduce((sum, item) => sum + (item.quantity_requested * item.unit_price), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#151515]">Department Orders</h1>
          <p className="text-gray-600 mt-1">Request supplies and equipment from inventory</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Order
        </button>
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

      {/* Orders List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requested By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
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
                    <td className="px-6 py-4 text-sm text-gray-600">{order.requested_by}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.total_items} items</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[order.priority]}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.status]}`}>
                        <StatusIcon size={12} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {fmt(order.estimated_cost)} IQD
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setCurrentOrder(order);
                          setModal('view');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create New Order</h2>
              <button onClick={() => { setModal(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => {
                      const dept = departments.find(d => d.department_id === e.target.value);
                      setDepartmentId(e.target.value);
                      setDepartmentName(dept?.department_name || '');
                      setDeliveryLocation(dept?.department_name || '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as OrderPriority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name or ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Staff Search Results */}
                  {showStaffResults && staff.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {staff.map(staffMember => (
                        <button
                          key={staffMember.staff_id}
                          onClick={() => handleStaffSelect(staffMember)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{staffMember.staff_name}</p>
                              <p className="text-xs text-gray-500">ID: {staffMember.staff_id}</p>
                              <p className="text-xs text-gray-500">{staffMember.position}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">{staffMember.department_name}</p>
                              {staffMember.staff_email && (
                                <p className="text-xs text-gray-400">{staffMember.staff_email}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={requestedByEmail}
                    onChange={(e) => setRequestedByEmail(e.target.value)}
                    placeholder="your.email@hospital.iq"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location *</label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="e.g., Emergency Room - Station 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional notes or special instructions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Add Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Items *</label>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search inventory items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {itemSearch && (
                  <div className="border border-gray-200 rounded-lg mb-4 max-h-48 overflow-y-auto">
                    {filteredInventory.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addItemToOrder(item)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{item.item_name}</p>
                            <p className="text-xs text-gray-500">{item.item_code} - {item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{fmt(item.unit_price)} IQD</p>
                            <p className="text-xs text-gray-500">Stock: {item.quantity_in_stock}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Items */}
                {orderItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Total</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderItems.map(item => (
                          <tr key={item.item_id}>
                            <td className="px-4 py-2 text-sm">{item.item_name}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity_requested}
                                onChange={(e) => updateItemQuantity(item.item_id, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm">{fmt(item.unit_price)} IQD</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {fmt(item.quantity_requested * item.unit_price)} IQD
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => removeItem(item.item_id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-semibold">Total:</td>
                          <td className="px-4 py-2 font-bold text-blue-600">{fmt(totalOrderValue)} IQD</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setModal(null); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={loading || !requestedBy || !deliveryLocation || orderItems.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {modal === 'view' && currentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[currentOrder.priority]}`}>
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
                    <p className="text-sm">{currentOrder.notes}</p>
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
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentOrder.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm">{item.item_name}</td>
                            <td className="px-4 py-2 text-sm">{item.quantity_requested} {item.unit_of_measure}</td>
                            <td className="px-4 py-2 text-sm">{fmt(item.unit_price)} IQD</td>
                            <td className="px-4 py-2 text-sm font-medium">{fmt(item.total_price)} IQD</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-semibold">Total:</td>
                          <td className="px-4 py-2 font-bold text-blue-600">{fmt(currentOrder.estimated_cost)} IQD</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              {(currentOrder.approved_at || currentOrder.packed_at || currentOrder.sent_at || currentOrder.delivered_at) && (
                <div>
                  <h3 className="font-semibold mb-3">Tracking Information</h3>
                  <div className="space-y-2">
                    {currentOrder.approved_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Approved by {currentOrder.approved_by} on {new Date(currentOrder.approved_at).toLocaleString()}</span>
                      </div>
                    )}
                    {currentOrder.packed_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-blue-600" />
                        <span>Packed by {currentOrder.packed_by} on {new Date(currentOrder.packed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {currentOrder.sent_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Package size={16} className="text-purple-600" />
                        <span>Sent by {currentOrder.sent_by} on {new Date(currentOrder.sent_at).toLocaleString()}</span>
                      </div>
                    )}
                    {currentOrder.delivered_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Delivered to {currentOrder.delivered_to} on {new Date(currentOrder.delivered_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
