'use client';

import React, { useState, useEffect } from 'react';
import { Search, DollarSign, TrendingUp, Award, Calendar, X, User, Building2, CreditCard } from 'lucide-react';

interface Staff {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  national_id?: string;
  department_name: string;
  job_title: string;
  email: string;
  phone: string;
}

interface Compensation {
  id: string;
  employee_id: string;
  basic_salary: string;
  housing_allowance: string;
  transport_allowance: string;
  meal_allowance: string;
  payment_frequency: string;
  currency: string;
  total_package: string;
  effective_from: string;
  is_active: boolean;
}

export default function HRCompensationViewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [compensation, setCompensation] = useState<Compensation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStaffList();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStaff(staffList);
    } else {
      const filtered = staffList.filter(staff => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${staff.first_name} ${staff.middle_name || ''} ${staff.last_name}`.toLowerCase();
        return (
          fullName.includes(searchLower) ||
          staff.employee_number?.toLowerCase().includes(searchLower) ||
          staff.national_id?.toLowerCase().includes(searchLower) ||
          staff.email?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredStaff(filtered);
    }
  }, [searchTerm, staffList]);

  const loadStaffList = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hr/employees');
      const result = await response.json();
      
      if (result.success && result.data) {
        setStaffList(result.data);
        setFilteredStaff(result.data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompensation = async (employeeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/compensation?employee_id=${employeeId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setCompensation(result.data);
      } else {
        setCompensation(null);
      }
    } catch (error) {
      console.error('Error loading compensation:', error);
      setCompensation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffClick = async (staff: Staff) => {
    setSelectedStaff(staff);
    setShowModal(true);
    await loadCompensation(staff.id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStaff(null);
    setCompensation(null);
  };

  const formatCurrency = (value: string | number) => {
    return parseFloat(value.toString()).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'WEEKLY': return 'Weekly';
      case 'BI-WEEKLY': return 'Bi-Weekly';
      case 'QUARTERLY': return 'Quarterly';
      default: return 'Monthly';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Staff Compensation</h2>
          <p className="page-description">View and manage employee compensation details</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, employee ID, or national ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            Staff Members ({filteredStaff.length})
          </h3>
        </div>
        <div className="tibbna-card-content" style={{ padding: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      EMPLOYEE
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      EMPLOYEE ID
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      DEPARTMENT
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      POSITION
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      CONTACT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr
                      key={staff.id}
                      onClick={() => handleStaffClick(staff)}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>
                              {staff.first_name} {staff.middle_name || ''} {staff.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#525252' }}>
                        {staff.employee_number || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#525252' }}>
                        {staff.department_name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#525252' }}>
                        {staff.job_title || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#525252' }}>
                        {staff.email || staff.phone || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStaff.length === 0 && !loading && (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto text-gray-300 mb-4" />
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    No staff members found matching your search
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compensation Modal */}
      {showModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                  {selectedStaff.first_name} {selectedStaff.middle_name || ''} {selectedStaff.last_name}
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                  {selectedStaff.employee_number} • {selectedStaff.department_name}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : compensation ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-blue-600" />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Basic Salary</span>
                      </div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                        {formatCurrency(compensation.basic_salary)} {compensation.currency}
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-600" />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Allowances</span>
                      </div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                        {formatCurrency(
                          parseFloat(compensation.housing_allowance) +
                          parseFloat(compensation.transport_allowance) +
                          parseFloat(compensation.meal_allowance)
                        )} {compensation.currency}
                      </p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-yellow-600" />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Total Package</span>
                      </div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                        {formatCurrency(compensation.total_package)} {compensation.currency}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className="text-purple-600" />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Frequency</span>
                      </div>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>
                        {getFrequencyLabel(compensation.payment_frequency)}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Compensation Breakdown</h4>
                    </div>
                    <div className="p-4">
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 500 }}>Basic Salary</td>
                            <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>
                              {formatCurrency(compensation.basic_salary)} {compensation.currency}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 500 }}>Housing Allowance</td>
                            <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>
                              {formatCurrency(compensation.housing_allowance)} {compensation.currency}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 500 }}>Transport Allowance</td>
                            <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>
                              {formatCurrency(compensation.transport_allowance)} {compensation.currency}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 500 }}>Meal Allowance</td>
                            <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>
                              {formatCurrency(compensation.meal_allowance)} {compensation.currency}
                            </td>
                          </tr>
                          <tr className="bg-blue-50">
                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}>Total Package</td>
                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, textAlign: 'right', color: '#3b82f6' }}>
                              {formatCurrency(compensation.total_package)} {compensation.currency}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>Effective from: {new Date(compensation.effective_from).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    No Compensation Data
                  </h4>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    No compensation information found for this employee.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
