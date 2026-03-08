'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  name_ar?: string;
  code: string;
  description?: string;
  description_ar?: string;
  max_days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  min_notice_days: number;
  max_consecutive_days: number;
  accrual_frequency: string;
  accrual_rate: number;
  carry_forward_allowed: boolean;
  carry_forward_limit: number;
  color: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    code: '',
    description: '',
    descriptionAr: '',
    maxDaysPerYear: 21,
    isPaid: true,
    requiresApproval: true,
    minNoticeDays: 1,
    maxConsecutiveDays: 365,
    accrualFrequency: 'YEARLY',
    accrualRate: 1.0,
    carryForwardAllowed: false,
    carryForwardLimit: 0,
    color: '#3B82F6',
    sortOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    loadLeaveTypes();
  }, [filterActive]);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActive !== null) {
        params.append('isActive', filterActive.toString());
      }
      
      const response = await fetch(`/api/hr/leave-types?${params}`);
      const data = await response.json();

      if (data.success) {
        setLeaveTypes(data.data);
      } else {
        toast.error('Failed to load leave types');
      }
    } catch (error) {
      console.error('Error loading leave types:', error);
      toast.error('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingType
        ? `/api/hr/leave-types/${editingType.id}`
        : '/api/hr/leave-types';
      
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowModal(false);
        resetForm();
        loadLeaveTypes();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving leave type:', error);
      toast.error('Failed to save leave type');
    }
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setFormData({
      name: leaveType.name,
      nameAr: leaveType.name_ar || '',
      code: leaveType.code,
      description: leaveType.description || '',
      descriptionAr: leaveType.description_ar || '',
      maxDaysPerYear: leaveType.max_days_per_year,
      isPaid: leaveType.is_paid,
      requiresApproval: leaveType.requires_approval,
      minNoticeDays: leaveType.min_notice_days,
      maxConsecutiveDays: leaveType.max_consecutive_days,
      accrualFrequency: leaveType.accrual_frequency,
      accrualRate: leaveType.accrual_rate,
      carryForwardAllowed: leaveType.carry_forward_allowed,
      carryForwardLimit: leaveType.carry_forward_limit,
      color: leaveType.color,
      sortOrder: leaveType.sort_order,
      isActive: leaveType.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;

    try {
      const response = await fetch(`/api/hr/leave-types/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        loadLeaveTypes();
      } else {
        toast.error(data.error || 'Failed to delete leave type');
      }
    } catch (error) {
      console.error('Error deleting leave type:', error);
      toast.error('Failed to delete leave type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameAr: '',
      code: '',
      description: '',
      descriptionAr: '',
      maxDaysPerYear: 21,
      isPaid: true,
      requiresApproval: true,
      minNoticeDays: 1,
      maxConsecutiveDays: 365,
      accrualFrequency: 'YEARLY',
      accrualRate: 1.0,
      carryForwardAllowed: false,
      carryForwardLimit: 0,
      color: '#3B82F6',
      sortOrder: 0,
      isActive: true,
    });
    setEditingType(null);
  };

  const filteredLeaveTypes = leaveTypes.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
        <p className="text-gray-600">Manage leave types and their configurations</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leave types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterActive === null ? 'all' : filterActive.toString()}
            onChange={(e) => {
              const value = e.target.value;
              setFilterActive(value === 'all' ? null : value === 'true');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Days/Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredLeaveTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No leave types found
                  </td>
                </tr>
              ) : (
                filteredLeaveTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {type.name}
                          </div>
                          {type.name_ar && (
                            <div className="text-sm text-gray-500" dir="rtl">
                              {type.name_ar}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {type.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.max_days_per_year} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {type.is_paid && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Paid
                          </span>
                        )}
                        {type.requires_approval && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Approval
                          </span>
                        )}
                        {type.carry_forward_allowed && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                            Carry Forward
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          type.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {type.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (Arabic)
                    </label>
                    <input
                      type="text"
                      value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ANNUAL, SICK, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Days Per Year
                    </label>
                    <input
                      type="number"
                      value={formData.maxDaysPerYear}
                      onChange={(e) => setFormData({ ...formData, maxDaysPerYear: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Notice Days
                    </label>
                    <input
                      type="number"
                      value={formData.minNoticeDays}
                      onChange={(e) => setFormData({ ...formData, minNoticeDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accrual Frequency
                    </label>
                    <select
                      value={formData.accrualFrequency}
                      onChange={(e) => setFormData({ ...formData, accrualFrequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="YEARLY">Yearly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carry Forward Limit
                    </label>
                    <input
                      type="number"
                      value={formData.carryForwardLimit}
                      onChange={(e) => setFormData({ ...formData, carryForwardLimit: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={!formData.carryForwardAllowed}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Paid Leave</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Requires Approval</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.carryForwardAllowed}
                      onChange={(e) => setFormData({ ...formData, carryForwardAllowed: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Carry Forward</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingType ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
