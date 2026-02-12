'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Hospital } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Demo quick-login entries
const QUICK_LOGINS = [
  { username: 'demo', password: 'demo123', label: 'HR Administrator', role: 'Admin' },
  { username: 'doctor', password: 'doctor123', label: 'Dr. Sarah Johnson', role: 'Doctor' },
  { username: 'nurse', password: 'nurse123', label: 'Nurse Mary', role: 'Nurse' },
  { username: 'pharmacist', password: 'pharmacist123', label: 'Sarah Ahmed', role: 'Pharmacist' },
  { username: 'billing', password: 'billing123', label: 'Billing Staff', role: 'Billing' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(username, password);

      if (success) {
        try {
          // Set session cookie so middleware can protect routes
          const maxAge = 60 * 60 * 8; // 8 hours
          document.cookie = `tibbna_session=${btoa(username)}; path=/; max-age=${maxAge}; SameSite=Strict`;
          router.push('/dashboard');
          router.refresh();
        } catch (err) {
          console.error('Storage error:', err);
          setError('Unable to save login session. Please check browser settings.');
          setIsLoading(false);
        }
      } else {
        setError('Invalid username or password');
        setIsLoading(false);
      }
    }, 500);
  };

  const quickLogin = (user: typeof QUICK_LOGINS[number]) => {
    setUsername(user.username);
    setPassword(user.password);
    setError('');
    // Auto-submit after state updates
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Hospital className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tibbna Hospital System</h1>
          <p className="text-gray-600 text-sm mt-2 text-center">
            Welcome back, please sign in to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Quick Demo Login</p>
          <div className="space-y-1.5">
            {QUICK_LOGINS.map((u) => (
              <button
                key={u.username}
                onClick={() => quickLogin(u)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition group disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-black">{u.label}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.username}</span>
                    {' / '}
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.password}</span>
                  </p>
                </div>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{u.role}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 italic text-center">Click any row above to auto-fill &amp; login</p>
        </div>
      </div>
    </div>
  );
}
