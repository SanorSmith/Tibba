'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReceptionLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('Starting login process with username:', username);

    try {
      const response = await fetch('/api/reception/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        
        // Store user info in localStorage for session management
        const userString = JSON.stringify(data.user);
        console.log('Storing user data:', userString);
        localStorage.setItem('reception_user', userString);
        console.log('User stored in localStorage');
        
        // Verify it was stored
        const stored = localStorage.getItem('reception_user');
        console.log('Verification - stored user data:', !!stored);
        
        router.push('/reception');
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        setError(errorData.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reception Counter</h1>
          <p className="text-gray-600">استقبال و الصندوق</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username / اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password / كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In / تسجيل الدخول'}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Demo Accounts / حسابات تجريبية:</p>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="font-semibold text-blue-900 mb-1">Receptionist / موظف استقبال</p>
              <p className="text-sm text-gray-700">
                <strong>Username:</strong> reception1<br/>
                <strong>Password:</strong> reception123
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="font-semibold text-green-900 mb-1">Manager / مدير</p>
              <p className="text-sm text-gray-700">
                <strong>Username:</strong> reception_manager<br/>
                <strong>Password:</strong> manager123
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            💡 Use these credentials to test the Reception Counter system
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Main / العودة للرئيسية
          </Link>
        </div>

        {/* Other Login Options */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3 text-center">Other Login Options / خيارات تسجيل الدخول الأخرى:</p>
          <div className="flex justify-center">
            <Link 
              href="/"
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xs font-semibold text-gray-800 text-center leading-tight">Main Portal</span>
              <span className="text-[10px] text-gray-400">All modules</span>
            </Link>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              console.log('Testing localStorage...');
              try {
                localStorage.setItem('test', 'value');
                const test = localStorage.getItem('test');
                console.log('LocalStorage test result:', test);
                localStorage.removeItem('test');
                alert('LocalStorage is working! Check console for details.');
              } catch (error) {
                console.error('LocalStorage error:', error);
                alert('LocalStorage error! Check console for details.');
              }
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700"
          >
            Test LocalStorage (Debug)
          </button>
        </div>
      </div>
    </div>
  );
}
