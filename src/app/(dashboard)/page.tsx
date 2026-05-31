'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Package, 
  Shield, 
  Heart,
  TrendingUp,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    lowStockItems: 0,
    activeStaff: 0,
    pendingInvoices: 0
  });

  useEffect(() => {
    setMounted(true);
    // Load dashboard stats
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Mock data for now - replace with real API calls
      setStats({
        totalPatients: 1247,
        todayAppointments: 23,
        monthlyRevenue: 4500000,
        lowStockItems: 12,
        activeStaff: 89,
        pendingInvoices: 5
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Tibbna Hospital Dashboard</h2>
          <p className="page-description">Welcome to your hospital management system</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="tibbna-grid-3 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Patients</p>
                <p className="tibbna-card-value">{stats.totalPatients.toLocaleString()}</p>
                <p className="tibbna-card-subtitle">Registered patients</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <Users size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Today's Appointments</p>
                <p className="tibbna-card-value">{stats.todayAppointments}</p>
                <p className="tibbna-card-subtitle">Scheduled today</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <Calendar size={20} style={{ color: '#059669' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Monthly Revenue</p>
                <p className="tibbna-card-value">{(stats.monthlyRevenue / 1000).toFixed(0)}K IQD</p>
                <p className="tibbna-card-subtitle">This month</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <DollarSign size={20} style={{ color: '#D97706' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Low Stock Items</p>
                <p className="tibbna-card-value" style={{ color: '#DC2626' }}>{stats.lowStockItems}</p>
                <p className="tibbna-card-subtitle">Need restocking</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Package size={20} style={{ color: '#DC2626' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Active Staff</p>
                <p className="tibbna-card-value">{stats.activeStaff}</p>
                <p className="tibbna-card-subtitle">On duty today</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <Heart size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Pending Invoices</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.pendingInvoices}</p>
                <p className="tibbna-card-subtitle">Awaiting payment</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="tibbna-section">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="tibbna-grid-2">
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h4 className="font-medium mb-3">Patient Management</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/reception/patients">
                  <button className="btn-secondary w-full text-sm">Manage Patients</button>
                </Link>
                <Link href="/reception/new">
                  <button className="btn-secondary w-full text-sm">Register Patient</button>
                </Link>
                <Link href="/reception/appointments">
                  <button className="btn-secondary w-full text-sm">Appointments</button>
                </Link>
                <Link href="/reception/invoices">
                  <button className="btn-secondary w-full text-sm">Billing</button>
                </Link>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h4 className="font-medium mb-3">Operations</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/inventory">
                  <button className="btn-secondary w-full text-sm">Inventory</button>
                </Link>
                <Link href="/inventory/pharmacy/dispensing">
                  <button className="btn-secondary w-full text-sm">Dispensing</button>
                </Link>
                <Link href="/finance">
                  <button className="btn-secondary w-full text-sm">Finance</button>
                </Link>
                <Link href="/hr">
                  <button className="btn-secondary w-full text-sm">HR</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="tibbna-section">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {[
                { icon: CheckCircle, color: '#059669', text: 'New patient registered: Ahmed Mohammed', time: '2 minutes ago' },
                { icon: Calendar, color: '#3B82F6', text: 'Appointment scheduled with Dr. Sarah', time: '15 minutes ago' },
                { icon: DollarSign, color: '#D97706', text: 'Payment received: 50,000 IQD', time: '1 hour ago' },
                { icon: Package, color: '#DC2626', text: 'Low stock alert: Paracetamol 500mg', time: '2 hours ago' },
                { icon: Users, color: '#6366F1', text: 'Staff meeting scheduled', time: '3 hours ago' },
              ].map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${activity.color}20` }}>
                      <Icon size={16} style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.text}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
