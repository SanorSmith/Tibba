'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Receipt, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

// Mock data - in production, this would come from the API
const mockInvoices = [
  {
    invoice_id: '1',
    invoice_number: 'INV-2024-00001',
    invoice_date: '2024-01-15',
    patient_id: '1',
    patient_name_ar: 'أحمد محمد',
    patient_name_en: 'Ahmed Mohammed',
    subtotal: 50000,
    discount_percentage: 10,
    discount_amount: 5000,
    total_amount: 45000,
    amount_paid: 45000,
    balance_due: 0,
    status: 'PAID',
    payment_method: 'CASH',
    payment_date: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    invoice_id: '2',
    invoice_number: 'INV-2024-00002',
    invoice_date: '2024-01-16',
    patient_id: '2',
    patient_name_ar: 'فاطمة علي',
    patient_name_en: 'Fatima Ali',
    subtotal: 75000,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 75000,
    amount_paid: 25000,
    balance_due: 50000,
    status: 'PARTIALLY_PAID',
    payment_method: 'CARD',
    payment_date: '2024-01-16',
    created_at: '2024-01-16T00:00:00Z',
  },
  {
    invoice_id: '3',
    invoice_number: 'INV-2024-00003',
    invoice_date: '2024-01-17',
    patient_id: '3',
    patient_name_ar: 'محمد حسن',
    patient_name_en: 'Mohammed Hassan',
    subtotal: 30000,
    discount_percentage: 5,
    discount_amount: 1500,
    total_amount: 28500,
    amount_paid: 0,
    balance_due: 28500,
    status: 'PENDING',
    created_at: '2024-01-17T00:00:00Z',
  },
];

export default function ReceptionInvoices() {
  const [invoices, setInvoices] = useState(mockInvoices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.patient_name_ar.toLowerCase().includes(search.toLowerCase()) ||
      invoice.patient_name_en?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle size={16} />;
      case 'PARTIALLY_PAID': return <Clock size={16} />;
      case 'PENDING': return <DollarSign size={16} />;
      case 'CANCELLED': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const openCreate = () => {
    setCurrentInvoice({
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      patient_id: '',
      patient_name_ar: '',
      patient_name_en: '',
      subtotal: 0,
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: 0,
      amount_paid: 0,
      balance_due: 0,
      status: 'PENDING',
      payment_method: 'CASH',
      notes: '',
    });
    setModal('create');
  };

  const openEdit = (invoice: any) => {
    setCurrentInvoice({ ...invoice });
    setModal('edit');
  };

  const openView = (invoice: any) => {
    setCurrentInvoice(invoice);
    setModal('view');
  };

  const handleSave = async () => {
    // Mock save function - in production, this would call the API
    console.log('Saving invoice:', currentInvoice);
    
    if (modal === 'create') {
      const newInvoice = {
        ...currentInvoice,
        invoice_id: Date.now().toString(),
        invoice_number: `INV-2024-${String(invoices.length + 1).padStart(5, '0')}`,
        created_at: new Date().toISOString(),
      };
      setInvoices([...invoices, newInvoice]);
    } else if (modal === 'edit') {
      setInvoices(invoices.map(i => 
        i.invoice_id === currentInvoice.invoice_id 
          ? currentInvoice 
          : i
      ));
    }
    
    setModal(null);
  };

  const handleDelete = async (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(i => i.invoice_id !== invoiceId));
    }
  };

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0);
  const pendingAmount = invoices.reduce((sum, invoice) => sum + invoice.balance_due, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Invoices</h1>
          <p className="text-gray-500 text-sm">فواتير العملاء</p>
        </div>
        <button 
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600">{pendingAmount.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{invoice.invoice_number}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{invoice.patient_name_ar}</div>
                      <div className="text-xs text-gray-500">{invoice.patient_name_en || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{invoice.invoice_date}</td>
                  <td className="px-4 py-3 text-right font-medium">{invoice.total_amount.toLocaleString()} IQD</td>
                  <td className="px-4 py-3 text-right text-green-600">{invoice.amount_paid.toLocaleString()} IQD</td>
                  <td className="px-4 py-3 text-right text-orange-600">{invoice.balance_due.toLocaleString()} IQD</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      <span className="ml-1">{invoice.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => openView(invoice)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye size={14} />
                      </button>
                      {invoice.status !== 'PAID' && (
                        <button 
                          onClick={() => openEdit(invoice)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(invoice.invoice_id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.invoice_id} className="p-4 cursor-pointer hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-xs text-gray-500">{invoice.invoice_number}</div>
                  <div className="font-medium">{invoice.patient_name_ar}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  <span className="ml-1">{invoice.status.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-medium">{invoice.total_amount.toLocaleString()} IQD</p>
                </div>
                <div>
                  <p className="text-gray-500">Paid</p>
                  <p className="font-medium text-green-600">{invoice.amount_paid.toLocaleString()} IQD</p>
                </div>
                <div>
                  <p className="text-gray-500">Balance</p>
                  <p className="font-medium text-orange-600">{invoice.balance_due.toLocaleString()} IQD</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => openView(invoice)}
                  className="p-1.5 hover:bg-gray-100 rounded text-sm"
                >
                  View
                </button>
                {invoice.status !== 'PAID' && (
                  <button 
                    onClick={() => openEdit(invoice)}
                    className="p-1.5 hover:bg-gray-100 rounded text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {(modal === 'create' || modal === 'edit' || modal === 'view') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === 'create' ? 'Create Invoice' : modal === 'edit' ? 'Edit Invoice' : 'Invoice Details'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Invoice Number</label>
                  <input
                    type="text"
                    value={currentInvoice?.invoice_number || ''}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, invoice_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Invoice Date</label>
                  <input
                    type="date"
                    value={currentInvoice?.invoice_date || ''}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, invoice_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient</label>
                  <select
                    value={currentInvoice?.patient_id || ''}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, patient_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="">Select Patient</option>
                    {/* In production, this would be populated from the patients API */}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subtotal</label>
                  <input
                    type="number"
                    value={currentInvoice?.subtotal || 0}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, subtotal: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Discount %</label>
                  <input
                    type="number"
                    value={currentInvoice?.discount_percentage || 0}
                    onChange={(e) => {
                      const discount = Number(e.target.value);
                      const discountAmount = (currentInvoice?.subtotal || 0) * (discount / 100);
                      const total = (currentInvoice?.subtotal || 0) - discountAmount;
                      setCurrentInvoice({
                        ...currentInvoice, 
                        discount_percentage: discount,
                        discount_amount: discountAmount,
                        total_amount: total
                      });
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Amount</label>
                  <input
                    type="number"
                    value={currentInvoice?.total_amount || 0}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, total_amount: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={currentInvoice?.status || 'PENDING'}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={currentInvoice?.payment_method || 'CASH'}
                    onChange={(e) => setCurrentInvoice({...currentInvoice, payment_method: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>
            
            {modal !== 'view' && (
              <div className="p-4 border-t flex gap-2 justify-end">
                <button 
                  onClick={() => setModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
