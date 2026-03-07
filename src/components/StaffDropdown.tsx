'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Staff {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: string;
  unit: string;
  specialty?: string;
  phone?: string;
  email?: string;
  customStaffId?: string;
}

interface StaffDropdownProps {
  value?: string;
  onChange: (staffId: string, staff: Staff | null) => void;
  placeholder?: string;
  className?: string;
}

export default function StaffDropdown({ 
  value, 
  onChange, 
  placeholder = "Select medical staff (optional)",
  className = ""
}: StaffDropdownProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async (search?: string) => {
    setLoading(true);
    try {
      const url = search 
        ? `/api/staff?q=${encodeURIComponent(search)}`
        : '/api/staff';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchStaff(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (searchTerm.length === 0) {
      fetchStaff();
    }
  }, [searchTerm]);

  const handleSelect = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    onChange(staffMember.id, staffMember);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedStaff(null);
    onChange('', null);
    setShowDropdown(false);
  };

  const displayText = selectedStaff 
    ? `${selectedStaff.firstName} ${selectedStaff.lastName} - ${selectedStaff.role}`
    : '';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedStaff ? displayText : searchTerm}
          onChange={(e) => {
            if (!selectedStaff) {
              setSearchTerm(e.target.value);
            }
          }}
          onFocus={() => {
            if (!selectedStaff) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {selectedStaff && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && !selectedStaff && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Loading staff...
            </div>
          ) : staff.length > 0 ? (
            staff.map((staffMember) => (
              <div
                key={staffMember.id}
                className="px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                onClick={() => handleSelect(staffMember)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {staffMember.firstName} {staffMember.middleName} {staffMember.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {staffMember.role} - {staffMember.unit}
                    </div>
                    {staffMember.specialty && (
                      <div className="text-xs text-gray-400">
                        {staffMember.specialty}
                      </div>
                    )}
                  </div>
                  {staffMember.customStaffId && (
                    <div className="text-xs text-gray-400">
                      {staffMember.customStaffId}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No staff found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
