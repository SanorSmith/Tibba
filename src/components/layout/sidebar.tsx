'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Hospital,
  Package,
  DollarSign,
  Shield,
  Users,
  CreditCard,
  UserCircle,
  Calendar,
  UsersRound,
  FlaskConical,
  Pill,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const moduleLinks = [
  { href: '/services', icon: Hospital, label: 'Services' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/finance', icon: DollarSign, label: 'Finance' },
  { href: '/insurance', icon: Shield, label: 'Insurance' },
  { href: '/hr', icon: Users, label: 'HR' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
];

const existingLinks = [
  { href: '/patients', icon: UserCircle, label: 'Patients' },
  { href: '/appointments', icon: Calendar, label: 'Appointments' },
  { href: '/staff', icon: UsersRound, label: 'Staff/Contacts' },
  { href: '/laboratories', icon: FlaskConical, label: 'Laboratories' },
  { href: '/pharmacies', icon: Pill, label: 'Pharmacies' },
  { href: '/departments', icon: Building2, label: 'Departments' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-60'
      )}
      style={{
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e4e4e4',
      }}
    >
      <div className="flex-1 overflow-y-auto py-3">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 mx-2 px-3 py-2 rounded transition-colors',
            pathname === '/dashboard'
              ? 'bg-[#f5f5f5] text-black font-semibold'
              : 'text-[#525252] hover:bg-[#f5f5f5]'
          )}
          style={{ fontSize: '14px', lineHeight: '20px' }}
        >
          <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </Link>

        {!isCollapsed && (
          <div className="px-4 mt-5 mb-1.5">
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Modules
            </h3>
          </div>
        )}

        <nav className="space-y-0.5 px-2">
          {moduleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded transition-colors',
                  isActive
                    ? 'bg-[#f5f5f5] text-black font-semibold'
                    : 'text-[#525252] hover:bg-[#f5f5f5]'
                )}
                style={{ fontSize: '14px', lineHeight: '20px' }}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="px-4 mt-5 mb-1.5">
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Existing System
            </h3>
          </div>
        )}

        <nav className="space-y-0.5 px-2">
          {existingLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded transition-colors',
                  isActive
                    ? 'bg-[#f5f5f5] text-black font-semibold'
                    : 'text-[#525252] hover:bg-[#f5f5f5]'
                )}
                style={{ fontSize: '14px', lineHeight: '20px' }}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ borderTop: '1px solid #e4e4e4', padding: '8px' }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded hover:bg-[#f5f5f5] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#a3a3a3]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#a3a3a3]" />
          )}
        </button>
      </div>
    </aside>
  );
}
