'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
