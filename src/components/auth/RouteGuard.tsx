'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, checkRouteAccess } = useAuth();

  useEffect(() => {
    // Don't check access while loading or on public pages
    if (isLoading) return;
    
    const publicPaths = ['/login', '/unauthorized'];
    if (publicPaths.includes(pathname)) return;

    // If not authenticated, redirect to login
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check if user has access to current route
    const hasAccess = checkRouteAccess(pathname);
    if (!hasAccess) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, pathname, router, checkRouteAccess]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
