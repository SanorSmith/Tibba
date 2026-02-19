'use client';

import { useEffect, useState } from 'react';
import { ShieldX, LogOut, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Read role from session API
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => setRole(d?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const getHomeRoute = () => {
    if (role === 'FINANCE_ADMIN') return '/finance';
    if (role === 'HR_ADMIN') return '/hr';
    if (role === 'INVENTORY_ADMIN') return '/inventory';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You are not authorized to access this page.
          {role && (
            <span className="block mt-1">
              Your role <span className="font-semibold text-gray-700">{role.replace('_', ' ')}</span> does not have permission for this module.
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={getHomeRoute()}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Go to My Module
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition"
          >
            <LogOut className="w-4 h-4" /> Log Out & Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
