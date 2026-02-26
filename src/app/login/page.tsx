'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Hospital, Shield, Loader2, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  {
    username: 'superadmin',
    password: 'super123',
    label: 'Super Admin',
    desc: 'Full System Access',
    route: '/dashboard',
    icon: '👑',
    modules: [
      { name: 'Dashboard', route: '/dashboard' },
      { name: 'Reception', route: '/reception' },
      { name: 'Finance', route: '/finance' },
      { name: 'HR', route: '/hr' },
      { name: 'Inventory', route: '/inventory' },
      { name: 'Billing', route: '/billing' },
      { name: 'Departments', route: '/departments' },
      { name: 'Staff', route: '/staff' },
      { name: 'Patients', route: '/reception/patients' },
      { name: 'Appointments', route: '/appointments' },
      { name: 'Laboratories', route: '/laboratories' },
      { name: 'Pharmacies', route: '/pharmacies' },
      { name: 'Services', route: '/services' },
      { name: 'Insurance', route: '/insurance' },
    ],
  },
  {
    username: 'reception',
    password: 'reception123',
    label: 'Reception',
    desc: 'Patient Management',
    route: '/reception',
    icon: '🏥',
    modules: [
      { name: 'Patients', route: '/reception/patients' },
      { name: 'Appointments', route: '/appointments' },
      { name: 'Registration', route: '/reception' },
      { name: 'Check-in', route: '/reception/checkin' },
      { name: 'Billing', route: '/billing' },
    ],
  },
  {
    username: 'finance',
    password: 'finance123',
    label: 'Finance',
    desc: 'Financial Operations',
    route: '/finance',
    icon: '💰',
    modules: [
      { name: 'Invoices', route: '/finance/invoices' },
      { name: 'Payments', route: '/finance/payments' },
      { name: 'Returns', route: '/finance/returns' },
      { name: 'Reports', route: '/finance/reports' },
      { name: 'Billing', route: '/billing' },
      { name: 'Insurance Claims', route: '/insurance' },
    ],
  },
  {
    username: 'hr',
    password: 'hr123',
    label: 'HR',
    desc: 'Human Resources',
    route: '/hr',
    icon: '👥',
    modules: [
      { name: 'Employees', route: '/hr/employees' },
      { name: 'Attendance', route: '/hr/attendance' },
      { name: 'Leaves', route: '/hr/leaves' },
      { name: 'Payroll', route: '/hr/payroll' },
      { name: 'Recruitment', route: '/hr/recruitment' },
      { name: 'Training', route: '/hr/training' },
      { name: 'Performance', route: '/hr/performance' },
    ],
  },
  {
    username: 'inventory',
    password: 'inventory123',
    label: 'Inventory',
    desc: 'Stock Management',
    route: '/inventory',
    icon: '📦',
    modules: [
      { name: 'Items', route: '/inventory/items' },
      { name: 'Stock', route: '/inventory/stock' },
      { name: 'Movements', route: '/inventory/movements' },
      { name: 'Purchase Orders', route: '/inventory/purchase-orders' },
      { name: 'Suppliers', route: '/inventory/suppliers' },
    ],
  },
  {
    username: 'doctor',
    password: 'doctor123',
    label: 'Doctor',
    desc: 'Clinical Access',
    route: '/dashboard',
    icon: '⚕️',
    modules: [
      { name: 'My Patients', route: '/patients' },
      { name: 'Appointments', route: '/appointments' },
      { name: 'Medical Records', route: '/patients/records' },
      { name: 'Prescriptions', route: '/pharmacies' },
      { name: 'Lab Orders', route: '/laboratories' },
    ],
  },
  {
    username: 'pharmacy',
    password: 'pharmacy123',
    label: 'Pharmacy',
    desc: 'Medication Management',
    route: '/pharmacies',
    icon: '💊',
    modules: [
      { name: 'Prescriptions', route: '/pharmacies/prescriptions' },
      { name: 'Dispensing', route: '/pharmacies/dispensing' },
      { name: 'Stock', route: '/inventory/pharmacy' },
      { name: 'Returns', route: '/pharmacies/returns' },
    ],
  },
  {
    username: 'lab',
    password: 'lab123',
    label: 'Laboratory',
    desc: 'Lab Operations',
    route: '/laboratories',
    icon: '🔬',
    modules: [
      { name: 'Test Orders', route: '/laboratories/orders' },
      { name: 'Results Entry', route: '/laboratories/results' },
      { name: 'Reports', route: '/laboratories/reports' },
      { name: 'Quality Control', route: '/laboratories/qc' },
    ],
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number] | null>(null);

  const doLogin = async (u: string, p: string) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Full page navigation so middleware sees the new cookie
        const role = ROLES.find(r => r.username === u.toLowerCase());
        const dest = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : (role?.route ?? '/dashboard');
        window.location.href = dest;
      } else {
        setError(data.error || 'Invalid credentials');
        setIsLoading(false);
      }
    } catch {
      setError('Network error — please try again');
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Enter your username'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }
    doLogin(username.trim(), password.trim());
  };

  const quickLogin = (role: typeof ROLES[number]) => {
    setUsername(role.username);
    setPassword(role.password);
    setError('');
    doLogin(role.username, role.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Hospital className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tibbna Hospital System</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to access your module</p>
          {returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3" /> Redirecting to <span className="font-mono font-bold">{returnTo}</span> after login
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Quick Login Cards */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Login - Select Your Role</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {ROLES.map(role => (
                <button
                  key={role.username}
                  onClick={() => setSelectedRole(role)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedRole?.username === role.username
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">{role.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 text-center leading-tight">{role.label}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 text-center">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Role Details */}
          {selectedRole && (
            <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl">{selectedRole.icon}</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">{selectedRole.label}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{selectedRole.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Accessible Modules ({selectedRole.modules.length}):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedRole.modules.map((module, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-lg border border-gray-200 text-xs"
                    >
                      <span className="text-blue-500">✓</span>
                      <span className="text-gray-700 font-medium truncate">{module.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => quickLogin(selectedRole)}
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in as {selectedRole.label}...</>
                  : <><Shield className="w-4 h-4" /> Login as {selectedRole.label}</>}
              </button>
            </div>
          )}

          {/* Manual Form */}
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Or sign in manually</p>

            {error && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. finance, hr, superadmin"
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  : 'Sign In'}
              </button>
            </form>

            {/* Credentials hint */}
            <div className="mt-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">Demo Credentials</p>
              <div className="space-y-1">
                {ROLES.map(r => (
                  <div key={r.username} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">{r.label}</span>
                    <span className="font-mono text-gray-400">{r.username} / {r.password}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

