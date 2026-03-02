'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Hospital, Shield, Loader2, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  {
    username: 'superadmin',
    password: 'super123',
    label: 'Super Admin',
    desc: 'All modules',
    route: '/dashboard',
  },
  {
    username: 'finance',
    password: 'finance123',
    label: 'Finance Admin',
    desc: 'Finance only',
    route: '/finance',
  },
  {
    username: 'hr',
    password: 'hr123',
    label: 'HR Admin',
    desc: 'HR only',
    route: '/hr',
  },
  {
    username: 'reception',
    password: 'reception123',
    label: 'Reception Admin',
    desc: 'Reception only',
    route: '/reception',
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
          <div className="p-6 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Login</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.username}
                  onClick={() => quickLogin(role)}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{role.label}</span>
                  <span className="text-[10px] text-gray-400">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>

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

