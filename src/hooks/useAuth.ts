'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { User } from '@/types/auth';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => void;
  hasRole: (requiredRole: string | string[]) => boolean;
  canApprove: (type: 'leave' | 'attendance' | 'payroll' | 'all') => boolean;
  hasPermission: (permission: string) => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COOKIE_NAME = 'tibbna_session';

// Admin roles that have elevated access
const ADMIN_ROLES = ['Administrator', 'HR_ADMIN'];

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeLogout = useAuthStore((state) => state.logout);
  const router = useRouter();

  /**
   * Logout: clear Zustand store, clear cookie, redirect to login
   */
  const logout = () => {
    // Clear Zustand persisted state
    storeLogout();

    // Clear session cookie
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;

    // Redirect to login
    router.push('/login');
    router.refresh();
  };

  /**
   * Check if user has required role(s).
   * Administrators have access to everything.
   */
  const hasRole = (requiredRole: string | string[]): boolean => {
    if (!user) return false;

    // Admins have access to everything
    if (ADMIN_ROLES.includes(user.role)) return true;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }

    return user.role === requiredRole;
  };

  /**
   * Check if user can approve specific types of requests
   */
  const canApprove = (type: 'leave' | 'attendance' | 'payroll' | 'all'): boolean => {
    if (!user) return false;

    // Admins can approve everything
    if (ADMIN_ROLES.includes(user.role)) return true;

    switch (type) {
      case 'leave':
      case 'attendance':
        return ['Administrator', 'HR_ADMIN', 'Doctor'].includes(user.role);
      case 'payroll':
        return ADMIN_ROLES.includes(user.role);
      case 'all':
        return ADMIN_ROLES.includes(user.role);
      default:
        return false;
    }
  };

  /**
   * Check if user has a specific permission from their permissions array
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  };

  return {
    user,
    isAuthenticated,
    logout,
    hasRole,
    canApprove,
    hasPermission,
  };
}
