'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Temporarily disable idle timeout - 10 minutes
  // useIdleTimeout(10);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="main-container min-h-screen">
      <Navbar onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#fcfcfc' }}>
          <div className="main-wrapper">
            <div className="inner-wrapper">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
