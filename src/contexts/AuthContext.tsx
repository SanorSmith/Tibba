'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'HR_ADMIN' | 'INVENTORY_ADMIN' | 'CLINICAL_ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  allowedModules: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAccess: (module: string) => boolean;
  checkRouteAccess: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Check route access when pathname changes
  useEffect(() => {
    if (user && pathname) {
      const hasAccess = checkRouteAccess(pathname);
      if (!hasAccess && pathname !== '/login' && pathname !== '/unauthorized') {
        router.push('/unauthorized');
      }
    }
  }, [pathname, user]);

  const loadSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.allowedModules.includes('*')) return true;
    return user.allowedModules.some(allowed => module.startsWith(allowed));
  };

  const checkRouteAccess = (path: string): boolean => {
    if (!user) return false;
    
    if (path === '/login' || path === '/unauthorized' || path === '/') return true;
    
    if (user.allowedModules.includes('*')) return true;
    
    return user.allowedModules.some(allowed => path.startsWith(allowed));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        hasAccess,
        checkRouteAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
