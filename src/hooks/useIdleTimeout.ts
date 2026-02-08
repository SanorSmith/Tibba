import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function useIdleTimeout(timeoutMinutes: number = 10) {
  const logout = useAuthStore((state) => state.logout);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('🔴 User idle for', timeoutMinutes, 'minutes - logging out...');
      logout();
      window.location.href = '/login';
    }, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Set initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMinutes, logout]);

  return { resetTimer };
}
