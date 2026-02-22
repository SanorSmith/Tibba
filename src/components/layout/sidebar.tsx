'use client';

import { useEffect } from 'react';
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
  ChevronDown,
  X,
  Clock,
  GraduationCap,
  Star,
  Heart,
  Briefcase,
  FileText,
  UserPlus,
  Receipt,
  Handshake,
  RotateCcw,
  ShoppingCart,
  Warehouse,
  Truck,
  BarChart3,
  BookOpen,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const moduleLinks = [
  { href: '/services', icon: Hospital, label: 'Services' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  {
    href: '/finance', icon: DollarSign, label: 'Finance',
    children: [
      { href: '/finance/patients', icon: UserCircle, label: 'Patients' },
      { href: '/finance/insurance', icon: Shield, label: 'Insurance' },
      { href: '/finance/invoices', icon: Receipt, label: 'Customer Invoices' },
      { href: '/finance/returns', icon: RotateCcw, label: 'Returns' },
      { href: '/finance/purchases', icon: ShoppingCart, label: 'Purchases' },
      { href: '/finance/inventory', icon: Warehouse, label: 'Inventory' },
      { href: '/finance/suppliers', icon: Truck, label: 'Suppliers' },
      { href: '/finance/budget', icon: PieChart, label: 'Budget' },
      { href: '/finance/accounting', icon: BookOpen, label: 'Accounting' },
      { href: '/finance/reports', icon: BarChart3, label: 'Reports' },
      { href: '/finance/shareholders', icon: TrendingUp, label: 'Shareholders' },
      { href: '/finance/stakeholders', icon: Handshake, label: 'Stakeholders' },
      { href: '/finance/service-payments', icon: CreditCard, label: 'Service Payments' },
      { href: '/finance/service-provider-reports', icon: BarChart3, label: 'Service Provider Reports' },
    ],
  },
  { href: '/insurance', icon: Shield, label: 'Insurance' },
  {
    href: '/hr', icon: Users, label: 'HR',
    children: [
      { href: '/hr/employees', icon: UsersRound, label: 'Employees' },
      { href: '/hr/attendance', icon: Clock, label: 'Attendance' },
      { href: '/hr/leaves', icon: Calendar, label: 'Leaves' },
      { href: '/hr/payroll', icon: DollarSign, label: 'Payroll' },
      { href: '/hr/recruitment', icon: UserPlus, label: 'Recruitment' },
      { href: '/hr/training', icon: GraduationCap, label: 'Training' },
      { href: '/hr/performance', icon: Star, label: 'Performance' },
      { href: '/hr/benefits', icon: Heart, label: 'Benefits' },
      { href: '/hr/organization', icon: Building2, label: 'Organization' },
      { href: '/hr/reports', icon: FileText, label: 'Reports' },
    ],
  },
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

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const SidebarNav = () => (
    <div className="flex-1 overflow-y-auto py-3">
      <Link
        href="/dashboard"
        className={cn(
          'flex items-center gap-3 mx-2 px-3 py-2.5 rounded transition-colors',
          pathname === '/dashboard'
            ? 'bg-[#f5f5f5] text-black font-semibold'
            : 'text-[#151515] hover:bg-[#f5f5f5]'
        )}
        style={{ fontSize: '14px', lineHeight: '20px' }}
      >
        <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" />
        <span>Dashboard</span>
      </Link>

      <div className="px-4 mt-5 mb-1.5">
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Modules
        </h3>
      </div>

      <nav className="space-y-0.5 px-2">
        {moduleLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          const hasChildren = 'children' in link && link.children;
          const isExpanded = isActive && hasChildren;
          return (
            <div key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded transition-colors',
                  isActive
                    ? 'bg-[#f5f5f5] text-black font-semibold'
                    : 'text-[#151515] hover:bg-[#f5f5f5]'
                )}
                style={{ fontSize: '14px', lineHeight: '20px' }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1">{link.label}</span>
                {hasChildren && (
                  <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded ? 'rotate-180' : '')} />
                )}
              </Link>
              {isExpanded && hasChildren && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#e4e4e4] pl-2">
                  {link.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors',
                          isChildActive
                            ? 'bg-[#f0f0f0] text-black font-semibold'
                            : 'text-[#151515] hover:bg-[#f5f5f5]'
                        )}
                        style={{ fontSize: '13px', lineHeight: '18px' }}
                      >
                        <ChildIcon className="w-[15px] h-[15px] flex-shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 mt-5 mb-1.5">
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Existing System
        </h3>
      </div>

      <nav className="space-y-0.5 px-2">
        {existingLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded transition-colors',
                isActive
                  ? 'bg-[#f5f5f5] text-black font-semibold'
                  : 'text-[#151515] hover:bg-[#f5f5f5]'
              )}
              style={{ fontSize: '14px', lineHeight: '20px' }}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - always visible on lg+ */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0"
        style={{
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e4e4e4',
        }}
      >
        <SidebarNav />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onMobileClose}
          />

          {/* Drawer */}
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-50 flex flex-col"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <span className="font-semibold text-base">Menu</span>
              <button
                onClick={onMobileClose}
                className="p-1.5 hover:bg-[#f5f5f5] rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <SidebarNav />
          </aside>
        </>
      )}
    </>
  );
}
