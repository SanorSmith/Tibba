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
        console.log('🔵 Auth Store: Login attempt', { username });
        console.log('🔵 Auth Store: Total users in database:', usersData.users.length);
        
        const userData = usersData.users.find(
          (u) => u.username === username && u.password === password
        );

        console.log('🔵 Auth Store: User found:', !!userData);
        
        if (userData) {
          console.log('✅ Auth Store: Setting user and isAuthenticated to true');
          console.log('🔵 Auth Store: User data:', userData.profile);
          set({ user: userData.profile as User, isAuthenticated: true });
          console.log('✅ Auth Store: State updated successfully');
          return true;
        }
        console.log('❌ Auth Store: No matching user found');
        return false;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
