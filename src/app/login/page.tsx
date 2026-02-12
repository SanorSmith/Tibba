'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Hospital } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_USERS = [
  { email: 'admin@tibbna.com', password: 'demo123', label: 'HR Administrator', role: 'Admin' },
  { email: 'doctor@tibbna.com', password: 'doctor123', label: 'Dr. Ahmed Hassan', role: 'Doctor' },
  { email: 'nurse@tibbna.com', password: 'nurse123', label: 'Nurse Fatima', role: 'Nurse' },
  { email: 'billing@tibbna.com', password: 'billing123', label: 'Billing Staff', role: 'Billing' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Welcome back, ${result.user?.name || 'User'}!`);
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Invalid credentials');
        toast.error(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 16px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '32px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Hospital size={28} color="#fff" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#000' }}>Tibbna Hospital</h1>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Electronic Health Records System</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: '8px 12px', marginBottom: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#991B1B' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#333' }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tibbna.com"
                style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1px solid #e4e4e4', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#333' }}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1px solid #e4e4e4', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', height: '40px', border: 'none', borderRadius: '6px',
                backgroundColor: '#000', color: '#fff', fontSize: '14px', fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#333', margin: '0 0 8px' }}>Demo Credentials (click to fill)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleQuickLogin(user.email, user.password)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', border: '1px solid #e4e4e4', borderRadius: '6px',
                  backgroundColor: '#fafafa', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 500, color: '#000' }}>{user.label}</span>
                <span style={{ fontSize: '11px', color: '#888', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{user.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
