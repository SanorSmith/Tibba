'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedLeaveRouteProps {
  children: ReactNode;
  requireRole?: string | string[];
  requirePermission?: string;
  fallback?: ReactNode;
}

export function ProtectedLeaveRoute({ 
  children, 
  requireRole, 
  requirePermission,
  fallback 
}: ProtectedLeaveRouteProps) {
  const { user, hasRole, hasPermission } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login to access this page</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user has required role
  if (requireRole && !hasRole(requireRole)) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
          <p className="text-red-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required role: {Array.isArray(requireRole) ? requireRole.join(' or ') : requireRole}
          </p>
          <p className="text-sm text-gray-500">
            Your role: {user.role}
          </p>
        </div>
      </div>
    );
  }

  // Check if user has required permission
  if (requirePermission && !hasPermission(requirePermission)) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
          <p className="text-red-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required permission: {requirePermission}
          </p>
        </div>
      </div>
    );
  }

  // Admin users have access to everything
  if (hasRole(['Administrator', 'HR_ADMIN'])) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Higher-order component for protecting routes
export function withLeaveProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireRole?: string | string[]; requirePermission?: string } = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedLeaveRoute 
        requireRole={options.requireRole}
        requirePermission={options.requirePermission}
      >
        <Component {...props} />
      </ProtectedLeaveRoute>
    );
  };
}

// Specific protection wrappers for different features
export function ProtectedApprovals({ children }: { children: ReactNode }) {
  return (
    <ProtectedLeaveRoute 
      requireRole={['Administrator', 'HR_ADMIN', 'Doctor', 'Manager']}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">Only managers and HR staff can access leave approvals.</p>
          </div>
        </div>
      }
    >
      {children}
    </ProtectedLeaveRoute>
  );
}

export function ProtectedAnalytics({ children }: { children: ReactNode }) {
  return (
    <ProtectedLeaveRoute 
      requireRole={['Administrator', 'HR_ADMIN']}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">Only administrators can access leave analytics.</p>
          </div>
        </div>
      }
    >
      {children}
    </ProtectedLeaveRoute>
  );
}

export function ProtectedLeaveManagement({ children }: { children: ReactNode }) {
  return (
    <ProtectedLeaveRoute 
      requireRole={['Administrator', 'HR_ADMIN', 'Manager']}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">Only HR staff and managers can access leave management.</p>
          </div>
        </div>
      }
    >
      {children}
    </ProtectedLeaveRoute>
  );
}
