import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { isAuthenticatedAtom, logoutAtom } from '@/store/atoms';
import { sessionService } from '@/services/sessionService';

/**
 * Hook to track user activity and automatically lock session after timeout
 * Should be used in the main App component or protected routes
 */
export function useSessionActivity() {
  const navigate = useNavigate();
  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const logout = useSetAtom(logoutAtom);

  useEffect(() => {
    const updateActivity = () => {
      sessionService.updateActivity();
    };

    // Track user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check for session timeout every 30 seconds
    const timeoutChecker = setInterval(async () => {
      const timedOut = await sessionService.checkTimeout();
      if (timedOut) {
        // Session expired - clear state and redirect to login
        logout();
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    }, 30000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(timeoutChecker);
    };
  }, [navigate, setIsAuthenticated, logout]);
}
