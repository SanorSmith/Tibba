'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  BarChart3,
  Calendar,
  Scale,
  Settings,
} from 'lucide-react';

const tabs = [
  { href: '/hr/leaves',           label: 'Overview',   icon: LayoutDashboard, exact: true },
  { href: '/hr/leaves/requests',  label: 'Requests',   icon: FileText },
  { href: '/hr/leaves/approvals', label: 'Approvals',  icon: CheckSquare },
  { href: '/hr/leaves/balances',  label: 'Balances',   icon: Scale },
  { href: '/hr/leaves/calendar',  label: 'Calendar',   icon: Calendar },
  { href: '/hr/leaves/analytics', label: 'Analytics',  icon: BarChart3 },
  { href: '/hr/leaves/admin',     label: 'Admin',      icon: Settings },
];

interface LeaveLayoutProps {
  children: ReactNode;
}

export default function LeaveLayout({ children }: LeaveLayoutProps) {
  const pathname = usePathname();

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="space-y-0">
      {/* Sub-navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 lg:px-6 overflow-x-auto">
          <nav className="flex gap-0 min-w-max">
            {tabs.map(tab => {
              const active = isActive(tab);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}
