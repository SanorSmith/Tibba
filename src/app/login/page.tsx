'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { ROLE_MODULES } from '@/lib/auth/role-modules';
import { useSearchParams } from 'next/navigation';
import { Hospital, Shield, Loader2, Eye, EyeOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

// The demo accounts that used to live here — four usernames with their
// passwords, plus one-click buttons that signed anyone in as Super Admin —
// were rendered on the production login page, readable by anyone who opened
// it. They are gone, along with the placeholder that named them.

function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // The Google flow reports failures by redirecting back with ?error=...
  const [error, setError] = useState(searchParams.get('error') || '');
  const [isLoading, setIsLoading] = useState(false);

  // Set when Google verified an identity that belongs to several facilities.
  // The picker then finishes the sign-in through /api/auth/google/select
  // instead of re-posting a password.
  const googleEmail = searchParams.get('googleEmail');

  // Second login step: shown only when the account belongs to more than one
  // facility, so the user picks which to open instead of the server guessing.
  type Facility = { workspaceId: string; name: string; type: string; role: string };
  const [facilities, setFacilities] = useState<Facility[] | null>(null);

  // Google verified the identity but it maps to more than one facility. Ask
  // the server which ones, using the signed pending cookie it set.
  useEffect(() => {
    if (!googleEmail) return;
    setUsername(googleEmail);
    fetch('/api/auth/google/facilities')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.facilities?.length) setFacilities(d.facilities);
        else setError('Sign-in expired. Please try again.');
      })
      .catch(() => setError('Sign-in expired. Please try again.'));
  }, [googleEmail]);

  const landAfterLogin = (role: string) => {
    const ROLE_HOME: Record<string, string> = {
      SUPER_ADMIN: '/dashboard',
      FINANCE_ADMIN: '/finance',
      HR_ADMIN: '/hr',
      INVENTORY_ADMIN: '/hospital',
      RECEPTION_ADMIN: '/reception',
    };
    const home = ROLE_HOME[role] ?? '/dashboard';
    const allowed = ROLE_MODULES[role] ?? [];
    const canReturn =
      !!returnTo &&
      returnTo.startsWith('/') &&
      !returnTo.startsWith('//') &&
      (allowed.includes('*') || allowed.some(p => returnTo.startsWith(p)));
    // Always the chooser, carrying where they were headed. Using returnTo
    // *instead of* the chooser hid it from administrators specifically: their
    // module list is '*', so canReturn was true for any path and the question
    // was skipped for the very people most likely to hold several roles.
    window.location.href = canReturn
      ? `/choose-role?returnTo=${encodeURIComponent(returnTo!)}`
      : '/choose-role';
    void home;
  };

  // Finish a Google sign-in once a facility has been chosen.
  const pickGoogleFacility = async (workspaceId: string) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) landAfterLogin(data.role);
      else {
        setError(data.error || 'Could not open that facility');
        setIsLoading(false);
      }
    } catch {
      setError('Network error — please try again');
      setIsLoading(false);
    }
  };

  const doLogin = async (u: string, p: string, workspaceId?: string) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p, ...(workspaceId ? { workspaceId } : {}) }),
      });
      const data = await res.json();
      if (res.ok && data.requiresFacilitySelection) {
        setFacilities(data.facilities);
        setIsLoading(false);
        return;
      }
      if (res.ok && data.success) {
        // Full page navigation so middleware sees the new cookie.
        // Land on a route this role can actually reach — the middleware only
        // lets FINANCE_ADMIN into /finance, RECEPTION_ADMIN into /reception and
        // so on, so defaulting everyone to /dashboard bounces them to
        // /unauthorized.
        const ROLE_HOME: Record<string, string> = {
          SUPER_ADMIN: '/dashboard',
          FINANCE_ADMIN: '/finance',
          HR_ADMIN: '/hr',
          INVENTORY_ADMIN: '/hospital',
          RECEPTION_ADMIN: '/reception',
        };
        const home = ROLE_HOME[data.role] ?? '/dashboard';
        const allowed = ROLE_MODULES[data.role] ?? [];
        // Only follow returnTo if this role can actually reach it — otherwise
        // the middleware immediately bounces them to /unauthorized. Landing on
        // "/" after being redirected from the root is the common case.
        const canReturn =
          !!returnTo &&
          returnTo.startsWith('/') &&
          !returnTo.startsWith('//') &&
          (allowed.includes('*') || allowed.some(p => returnTo.startsWith(p)));
        // See landAfterLogin: the chooser decides, carrying the destination
        // rather than being replaced by it.
        window.location.href = canReturn
          ? `/choose-role?returnTo=${encodeURIComponent(returnTo!)}`
          : '/choose-role';
        void home;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Hospital className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in with your Google account, or your username and password
          </p>
          {returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3" /> Redirecting to <span className="font-mono font-bold">{returnTo}</span> after login
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Facility picker — replaces the form when the account belongs to
              more than one facility. Nothing is signed in until one is chosen. */}
          {facilities ? (
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Choose facility</p>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{username}</span> has access to {facilities.length} facilities.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}

            <div className="space-y-2">
              {facilities.map(f => (
                <button
                  key={f.workspaceId}
                  onClick={() =>
                    googleEmail
                      ? pickGoogleFacility(f.workspaceId)
                      : doLogin(username.trim(), password.trim(), f.workspaceId)
                  }
                  disabled={isLoading}
                  className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{f.name}</span>
                    <span className="block text-[11px] text-gray-400 capitalize">
                      {f.type} · {f.role.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <Hospital className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>

            <button
              onClick={() => { setFacilities(null); setPassword(''); setError(''); }}
              className="mt-4 w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition"
            >
              ← Sign in as someone else
            </button>
          </div>
          ) : (
          <>

          {/* Google sign-in — the primary route for real staff accounts, which
              are provisioned in the Tibbna platform and have no password here. */}
          <div className="px-6 pt-6">
            <a
              href={`/api/auth/google${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                />
              </svg>
              Continue with Google
            </a>
            <div className="relative my-5 text-center text-xs">
              <span className="absolute inset-0 top-1/2 border-t border-gray-200" aria-hidden="true" />
              <span className="relative bg-white px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Manual Form */}
          <div className="px-6 pb-6">
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
                  placeholder="Your username"
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
          </div>
          </>
          )}
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

