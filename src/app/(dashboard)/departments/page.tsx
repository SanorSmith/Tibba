'use client';

import { Building2, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DepartmentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-600 mt-1">Manage hospital departments and divisions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Department Orders Card */}
        <Link href="/departments/orders">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Orders</h3>
            <p className="text-sm text-gray-600">
              Create and track orders for supplies and equipment from inventory
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-blue-600 font-medium">Click to access →</span>
            </div>
          </div>
        </Link>

        {/* Department Management - Coming Soon */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 opacity-60">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Management</h3>
          <p className="text-sm text-gray-600">
            Manage department information, staff, and resources
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">📦 Department Ordering System</h3>
        <p className="text-sm text-blue-800">
          Hospital staff can now place orders for supplies and equipment directly from their departments. 
          The inventory team will process, pack, and deliver your orders with full tracking.
        </p>
      </div>
    </div>
  );
}
