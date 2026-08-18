"use client";

import { useState, useEffect } from 'react';
import { Search, Users, Receipt, Plus, Filter, Download, Bell, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function ReceptionPage() {
  const [stats, setStats] = useState({
    todayPatients: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    totalRevenue: 0,
    activeAppointments: 0
  });
  const [activity, setActivity] = useState<Array<{
    kind: string; who: string; amount: number | null; status: string | null; at: string;
  }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Real figures for the facility this session is signed in to. These were
    // hardcoded placeholders, identical for every hospital.
    let cancelled = false;
    fetch('/api/reception/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.data) return;
        setStats({
          todayPatients: d.data.todayPatients,
          pendingPayments: d.data.pendingPayments,
          pendingAmount: d.data.pendingAmount,
          totalRevenue: d.data.todayRevenue,
          activeAppointments: d.data.activeAppointments,
        });
        setActivity(d.data.recentActivity ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function timeAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return `${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? '' : 's'} ago`;
  }

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
              <p className="text-2xl font-bold text-[#151515] mt-1">{loaded ? stats.todayPatients : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Seen at this facility today</p>
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
              <p className="text-2xl font-bold text-[#151515] mt-1">{loaded ? stats.pendingPayments : '—'}</p>
              <p className="text-xs text-orange-600 mt-1">
                {stats.pendingAmount.toLocaleString()} IQD outstanding
              </p>
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
              <p className="text-2xl font-bold text-[#151515] mt-1">
                {loaded ? stats.totalRevenue.toLocaleString() : '—'} IQD
              </p>
              <p className="text-xs text-gray-500 mt-1">Collected here today</p>
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
              <p className="text-2xl font-bold text-[#151515] mt-1">{loaded ? stats.activeAppointments : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled here today</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
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
              href="/reception/new"
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
              href="/reception/returns"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-[#151515]">Process Returns</p>
                <p className="text-sm text-gray-600">Handle returns</p>
              </div>
            </Link>

            <Link 
              href="/reception/appointments"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
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
            {!loaded ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet at this facility.</p>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.kind === 'invoice' ? 'bg-green-100' : 'bg-purple-100'}`}>
                      {item.kind === 'invoice'
                        ? <Receipt className="w-4 h-4 text-green-600" />
                        : <Calendar className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {item.kind === 'invoice' ? 'Invoice created' : 'Appointment booked'}
                      </p>
                      <p className="text-xs text-gray-600">{item.who} - {timeAgo(item.at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs ${item.status === 'PAID' || item.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                    {item.amount != null ? `${item.amount.toLocaleString()} IQD` : (item.status ?? '')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
