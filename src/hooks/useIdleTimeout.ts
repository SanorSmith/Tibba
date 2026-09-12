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
      logout();
      // Cleared for the host and, on tibbna.com, for the shared domain as
      // well - a cookie is only replaced by one whose name, path and domain
      // all match, so dropping the domain here would leave the session in
      // place and the idle timeout would do nothing.
      document.cookie = 'tibbna_session=; path=/; max-age=0';
      if (window.location.hostname.endsWith('tibbna.com')) {
        document.cookie =
          'tibbna_session=; path=/; domain=.tibbna.com; max-age=0';
      }
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
