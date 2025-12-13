import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useOnlineStatus() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  // Track user activity with debouncing
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }

    if (status === 'unauthenticated' || !session?.user?.email) {
      setIsLoading(false);
      return;
    }

    // Only proceed if authenticated
    if (status === 'authenticated' && session?.user?.email) {
      setIsLoading(false);
      
      // Add activity tracking listeners
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, trackActivity, { passive: true });
      });

      return () => {
        // Cleanup event listeners
        events.forEach(event => {
          document.removeEventListener(event, trackActivity);
        });
      };
    }
  }, [status, session?.user?.email, trackActivity]);

  return {
    isLoading,
    trackActivity,
  };
}