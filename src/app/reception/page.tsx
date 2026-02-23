'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReceptionDashboard() {
  const [stats, setStats] = useState({
    total_patients: 0,
    total_invoices: 0,
    total_bookings: 0,
    total_revenue: 0,
    today_bookings: 0,
    today_revenue: 0,
    pending_payments: 0,
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      type: 'patient',
      description: 'New patient registered',
      arabicDescription: 'تسجيل مريض جديد',
      time: '10:30 AM',
      patient: 'أحمد محمد',
    },
    {
      id: 2,
      type: 'payment',
      description: 'Payment received',
      arabicDescription: 'تم استلام الدفعة',
      time: '10:15 AM',
      amount: '50,000 IQD',
    },
    {
      id: 3,
      type: 'booking',
      description: 'Consultation booked',
      arabicDescription: 'حجز استشارة',
      time: '9:45 AM',
      patient: 'فاطمة علي',
    },
  ]);

  useEffect(() => {
    // Load dashboard stats (mock data for now)
    setStats({
      total_patients: 156,
      total_invoices: 89,
      total_bookings: 45,
      total_revenue: 2450000,
      today_bookings: 12,
      today_revenue: 350000,
      pending_payments: 8,
    });
  }, []);

  const statCards = [
    {
      title: 'Total Patients',
      arabicTitle: 'إجمالي المرضى',
      value: stats.total_patients,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2a3 3 0 00-5.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      link: '/reception/patients',
    },
    {
      title: 'Today\'s Bookings',
      arabicTitle: 'حجوزات اليوم',
      value: stats.today_bookings,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-green-500',
      link: '/reception/bookings',
    },
    {
      title: 'Total Revenue',
      arabicTitle: 'إجمالي الإيرادات',
      value: stats.total_revenue.toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2zm0-8c1.11 0 2 .89 2 2s-.89 2-2 2-2-.89-2-2 .89-2 2-2zm11 11V2l-5.586 5.586a2 2 0 00-.707.293l-2.414 2.414a2 2 0 00-.707.293L7.586 8.293a2 2 0 00-.707-.293l-2.414-2.414A2 2 0 004.262 6.262L6 8.586V16h8.586l-2.414-2.414a2 2 0 00-.707-.293l-2.414-2.414A2 2 0 0010.738 6.262L13 3.586V12h8.586z" />
        </svg>
      ),
      color: 'bg-yellow-500',
      link: '/reception/payments',
    },
    {
      title: 'Pending Payments',
      arabicTitle: 'المدفوعات المعلقة',
      value: stats.pending_payments,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-red-500',
      link: '/reception/payments',
    },
  ];

  const quickActions = [
    {
      title: 'Register Patient',
      arabicTitle: 'تسجيل مريض',
      description: 'Add new patient to system',
      arabicDescription: 'إضافة مريض جديد للنظام',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-9h-9m0 0h-9m9 9V3m0 0V0m0 0h-9m9 9a3 3 0 01-3 3m0 0a3 3 0 00-3-3m0 0h9m-9-3v3m0 0V0m0 0h9" />
        </svg>
      ),
      link: '/reception/patients?action=new',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Create Invoice',
      arabicTitle: 'إنشاء فاتورة',
      description: 'Generate new invoice',
      arabicDescription: 'إنشاء فاتورة جديدة',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      link: '/reception/invoices?action=new',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'Book Consultation',
      arabicTitle: 'حجز استشارة',
      description: 'Schedule new consultation',
      arabicDescription: 'جدولة استشارة جديدة',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      link: '/reception/bookings?action=new',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Process Payment',
      arabicTitle: 'معالجة الدفعة',
      description: 'Record payment transaction',
      arabicDescription: 'تسجيل معاملة دفعة',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm2-10V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2z" />
        </svg>
      ),
      link: '/reception/payments?action=new',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reception Dashboard</h1>
        <p className="text-gray-600">لوحة تحكم الاستقبال والصندوق</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            href={stat.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.arabicTitle}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions / إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.link}
              className={`${action.color} text-white rounded-xl p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-center mb-4">
                {action.icon}
              </div>
              <h3 className="font-semibold mb-1">{action.title}</h3>
              <p className="text-sm opacity-90 mb-1">{action.arabicTitle}</p>
              <p className="text-xs opacity-75">{action.description}</p>
              <p className="text-xs opacity-75">{action.arabicDescription}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities / الأنشطة الأخيرة</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'patient' ? 'bg-blue-100' :
                    activity.type === 'payment' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    {activity.type === 'patient' && (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2a3 3 0 00-5.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {activity.type === 'payment' && (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm2-10V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2z" />
                      </svg>
                    )}
                    {activity.type === 'booking' && (
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.arabicDescription}</p>
                    {activity.patient && (
                      <p className="text-xs text-gray-400 mt-1">{activity.patient}</p>
                    )}
                    {activity.amount && (
                      <p className="text-xs text-gray-400 mt-1">{activity.amount}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
