import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types/auth';
import usersData from '@/data/users.json';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (username: string, password: string) => {
        
        const userData = usersData.users.find(
          (u) => u.username === username && u.password === password
        );

        
        if (userData) {
          set({ user: userData.profile as User, isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
