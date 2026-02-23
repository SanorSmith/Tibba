"use client";

import { useState, useEffect } from 'react';
import { Search, Users, Receipt, Plus, Filter, Download } from 'lucide-react';
import Link from 'next/link';

export default function ReceptionPage() {
  const [stats, setStats] = useState({
    todayPatients: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    activeAppointments: 0
  });

  useEffect(() => {
    // Load reception dashboard stats
    setStats({
      todayPatients: 24,
      pendingPayments: 8,
      totalRevenue: 1250000,
      activeAppointments: 15
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#151515]">Reception Counter</h1>
          <p className="text-gray-600 mt-1">Patient registration and payment management</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Patients</p>
              <p className="text-2xl font-bold text-[#151515] mt-1">{stats.todayPatients}</p>
              <p className="text-xs text-green-600 mt-1">+12% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-[#151515] mt-1">{stats.pendingPayments}</p>
              <p className="text-xs text-orange-600 mt-1">Awaiting payment</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-[#151515] mt-1">{stats.totalRevenue.toLocaleString()} IQD</p>
              <p className="text-xs text-green-600 mt-1">+8% from average</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Appointments</p>
              <p className="text-2xl font-bold text-[#151515] mt-1">{stats.activeAppointments}</p>
              <p className="text-xs text-blue-600 mt-1">Next 2 hours</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#151515] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/reception/patients"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-[#151515]">Register Patient</p>
                <p className="text-sm text-gray-600">Add new patient</p>
              </div>
            </Link>

            <Link 
              href="/reception/invoices"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-[#151515]">Create Invoice</p>
                <p className="text-sm text-gray-600">New consultation</p>
              </div>
            </Link>

            <Link 
              href="/reception/payments"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-[#151515]">Process Payment</p>
                <p className="text-sm text-gray-600">Collect fees</p>
              </div>
            </Link>

            <Link 
              href="/reception/appointments"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-[#151515]">Schedule</p>
                <p className="text-sm text-gray-600">Book appointments</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#151515] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">New patient registered</p>
                  <p className="text-xs text-gray-600">Ahmed Mohammed - 2 mins ago</p>
                </div>
              </div>
              <span className="text-xs text-green-600">Completed</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Payment received</p>
                  <p className="text-xs text-gray-600">Consultation fee - 5 mins ago</p>
                </div>
              </div>
              <span className="text-xs text-green-600">50,000 IQD</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Invoice created</p>
                  <p className="text-xs text-gray-600">Dr. Smith consultation - 10 mins ago</p>
                </div>
              </div>
              <span className="text-xs text-orange-600">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
