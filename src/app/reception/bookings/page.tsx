'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Calendar, Clock, User, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Mock data - in production, this would come from the API
const mockBookings = [
  {
    booking_id: '1',
    booking_number: 'BK-2024-00001',
    patient_id: '1',
    patient_name_ar: 'أحمد محمد',
    patient_name_en: 'Ahmed Mohammed',
    service_id: '1',
    service_name_ar: 'استشارة طب عام',
    service_name_en: 'General Consultation',
    booking_date: '2024-01-20',
    booking_time: '10:30',
    status: 'SCHEDULED',
    consultation_fee: 25000,
    amount_paid: 0,
    balance_due: 25000,
    notes: 'First visit',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    booking_id: '2',
    booking_number: 'BK-2024-00002',
    patient_id: '2',
    patient_name_ar: 'فاطمة علي',
    patient_name_en: 'Fatima Ali',
    service_id: '2',
    service_name_ar: 'استشارة قلب',
    service_name_en: 'Cardiology Consultation',
    booking_date: '2024-01-20',
    booking_time: '11:00',
    status: 'CHECKED_IN',
    consultation_fee: 50000,
    amount_paid: 50000,
    balance_due: 0,
    notes: 'Follow-up visit',
    created_at: '2024-01-16T00:00:00Z',
  },
  {
    booking_id: '3',
    booking_number: 'BK-2024-00003',
    patient_id: '3',
    patient_name_ar: 'محمد حسن',
    patient_name_en: 'Mohammed Hassan',
    service_id: '3',
    service_name_ar: 'استشارة أطفال',
    service_name_en: 'Pediatric Consultation',
    booking_date: '2024-01-19',
    booking_time: '09:00',
    status: 'COMPLETED',
    consultation_fee: 30000,
    amount_paid: 30000,
    balance_due: 0,
    notes: 'Regular checkup',
    created_at: '2024-01-17T00:00:00Z',
  },
];

export default function ReceptionBookings() {
  const [bookings, setBookings] = useState(mockBookings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('TODAY');
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.booking_number.toLowerCase().includes(search.toLowerCase()) ||
      booking.patient_name_ar.toLowerCase().includes(search.toLowerCase()) ||
      booking.patient_name_en?.toLowerCase().includes(search.toLowerCase()) ||
      booking.service_name_ar.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
    
    // Simple date filter - in production, this would be more sophisticated
    const today = new Date().toISOString().split('T')[0];
    const matchesDate = 
      dateFilter === 'ALL' || 
      (dateFilter === 'TODAY' && booking.booking_date === today) ||
      (dateFilter === 'UPCOMING' && booking.booking_date >= today);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return <Calendar size={16} />;
      case 'CHECKED_IN': return <AlertCircle size={16} />;
      case 'IN_PROGRESS': return <Clock size={16} />;
      case 'COMPLETED': return <CheckCircle size={16} />;
      case 'CANCELLED': return <XCircle size={16} />;
      case 'NO_SHOW': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const openCreate = () => {
    setCurrentBooking({
      booking_number: '',
      patient_id: '',
      patient_name_ar: '',
      patient_name_en: '',
      service_id: '',
      service_name_ar: '',
      service_name_en: '',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '',
      status: 'SCHEDULED',
      consultation_fee: 0,
      amount_paid: 0,
      balance_due: 0,
      notes: '',
    });
    setModal('create');
  };

  const openEdit = (booking: any) => {
    setCurrentBooking({ ...booking });
    setModal('edit');
  };

  const openView = (booking: any) => {
    setCurrentBooking(booking);
    setModal('view');
  };

  const handleSave = async () => {
    // Mock save function - in production, this would call the API
    console.log('Saving booking:', currentBooking);
    
    if (modal === 'create') {
      const newBooking = {
        ...currentBooking,
        booking_id: Date.now().toString(),
        booking_number: `BK-2024-${String(bookings.length + 1).padStart(5, '0')}`,
        created_at: new Date().toISOString(),
      };
      setBookings([...bookings, newBooking]);
    } else if (modal === 'edit') {
      setBookings(bookings.map(b => 
        b.booking_id === currentBooking.booking_id 
          ? currentBooking 
          : b
      ));
    }
    
    setModal(null);
  };

  const handleDelete = async (bookingId: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      setBookings(bookings.filter(b => b.booking_id !== bookingId));
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setBookings(bookings.map(b => 
      b.booking_id === bookingId 
        ? { ...b, status: newStatus }
        : b
    ));
  };

  const todayBookings = bookings.filter(b => b.booking_date === new Date().toISOString().split('T')[0]);
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.amount_paid, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Bookings</h1>
          <p className="text-gray-500 text-sm">حجوزات الاستشارات</p>
        </div>
        <button 
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Book Consultation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{todayBookings.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
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
            placeholder="Search bookings..."
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
          <option value="SCHEDULED">Scheduled</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="TODAY">Today</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Booking #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredBookings.map((booking) => (
                <tr key={booking.booking_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{booking.booking_number}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{booking.patient_name_ar}</div>
                      <div className="text-xs text-gray-500">{booking.patient_name_en || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{booking.service_name_ar}</div>
                      <div className="text-xs text-gray-500">{booking.service_name_en || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{booking.booking_date}</span>
                      <Clock size={14} className="text-gray-400" />
                      <span>{booking.booking_time}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{booking.consultation_fee.toLocaleString()} IQD</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="ml-1">{booking.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => openView(booking)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye size={14} />
                      </button>
                      {booking.status !== 'COMPLETED' && (
                        <button 
                          onClick={() => openEdit(booking)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(booking.booking_id)}
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
          {filteredBookings.map((booking) => (
            <div key={booking.booking_id} className="p-4 cursor-pointer hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-xs text-gray-500">{booking.booking_number}</div>
                  <div className="font-medium">{booking.patient_name_ar}</div>
                  <div className="text-sm text-gray-600">{booking.service_name_ar}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  <span className="ml-1">{booking.status.replace('_', ' ')}</span>
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {booking.booking_date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {booking.booking_time}
                </span>
                <span className="font-medium">{booking.consultation_fee.toLocaleString()} IQD</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openView(booking)}
                  className="p-1.5 hover:bg-gray-100 rounded text-sm"
                >
                  View
                </button>
                {booking.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => openEdit(booking)}
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
                {modal === 'create' ? 'Book Consultation' : modal === 'edit' ? 'Edit Booking' : 'Booking Details'}
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
                  <label className="text-sm font-medium text-gray-700">Booking Number</label>
                  <input
                    type="text"
                    value={currentBooking?.booking_number || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, booking_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient</label>
                  <select
                    value={currentBooking?.patient_id || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, patient_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="">Select Patient</option>
                    {/* In production, this would be populated from the patients API */}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Service</label>
                  <select
                    value={currentBooking?.service_id || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, service_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="">Select Service</option>
                    {/* In production, this would be populated from the services API */}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={currentBooking?.booking_date || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, booking_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={currentBooking?.booking_time || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, booking_time: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Consultation Fee</label>
                  <input
                    type="number"
                    value={currentBooking?.consultation_fee || 0}
                    onChange={(e) => setCurrentBooking({...currentBooking, consultation_fee: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={currentBooking?.status || 'SCHEDULED'}
                    onChange={(e) => setCurrentBooking({...currentBooking, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={currentBooking?.notes || ''}
                    onChange={(e) => setCurrentBooking({...currentBooking, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    disabled={modal === 'view'}
                  />
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
