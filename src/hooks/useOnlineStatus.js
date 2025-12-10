import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useOnlineStatus() {
  const { data: session, status } = useSession();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeIntervalRef = useRef(null);
  const fetchIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Optimized heartbeat with performance considerations
  const sendHeartbeat = useCallback(async (isImmediate = false) => {
    if (!session?.user?.email || status !== 'authenticated') {
      return false;
    }
    
    try {
      // Use AbortController for timeout and cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          isImmediate
        }),
        signal: controller.signal,
        // Performance optimizations
        keepalive: true, // Keep connection alive for better performance
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        lastActivityRef.current = Date.now();
        return true;
      } else {
        console.warn('Heartbeat failed:', data.error);
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Heartbeat timeout');
      } else {
        console.warn('Heartbeat error:', error.message);
      }
      return false;
    }
  }, [session?.user?.email, status]);

  // Track user activity with debouncing
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Optimized fetch with performance monitoring
  const fetchOnlineUsers = useCallback(async (includeList = false) => {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`/api/users/online?includeList=${includeList}`, {
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const duration = Math.round(performance.now() - startTime);
      
      if (data.success) {
        setOnlineCount(data.onlineCount);
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
        
        // Log performance in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Fetch completed: ${duration}ms ${data.cached ? '(cached)' : '(fresh)'}`);
        }
      } else {
        console.warn('Failed to fetch online users:', data.error);
      }
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Fetch timeout after ${duration}ms`);
      } else {
        console.warn(`❌ Fetch error after ${duration}ms:`, error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clear any existing intervals
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    if (status === 'loading') {
      return; // Wait for session to load
    }

    if (status === 'unauthenticated' || !session?.user?.email) {
      setIsLoading(false);
      setOnlineCount(0);
      setOnlineUsers([]);
      return;
    }

    // Only proceed if authenticated
    if (status === 'authenticated' && session?.user?.email) {
      console.log('Setting up enhanced online tracking for:', session.user.email);
      
      // Initialize tracking with immediate heartbeat
      const initializeTracking = async () => {
        const success = await sendHeartbeat(true);
        if (success) {
          // Fetch online users after successful heartbeat
          setTimeout(() => fetchOnlineUsers(true), 200);
        }
      };
      
      initializeTracking();

      // Optimized heartbeat system - adaptive frequency
      heartbeatIntervalRef.current = setInterval(async () => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        
        // Only send heartbeat if user was active in last 3 minutes
        if (timeSinceActivity < 3 * 60 * 1000) {
          await sendHeartbeat();
        }
      }, 20000); // Reduced to 20s for better performance

      // Optimized fetch - only when on online users page or when needed
      const isOnOnlineUsersPage = window.location.pathname.includes('/online-users');
      const fetchInterval = isOnOnlineUsersPage ? 10000 : 30000; // 10s on page, 30s elsewhere
      
      fetchIntervalRef.current = setInterval(() => {
        const currentlyOnPage = window.location.pathname.includes('/online-users');
        if (currentlyOnPage) {
          fetchOnlineUsers(true);
        } else {
          // Just get count when not on the page
          fetchOnlineUsers(false);
        }
      }, fetchInterval);

      // Enhanced visibility change handling
      const handleVisibilityChange = async () => {
        if (!document.hidden && status === 'authenticated') {
          trackActivity();
          const success = await sendHeartbeat(true);
          if (success) {
            setTimeout(() => fetchOnlineUsers(true), 200);
          }
        }
      };

      // Enhanced activity tracking with immediate heartbeat for critical actions
      let activityTimeout;
      let lastHeartbeat = 0;
      
      const handleUserActivity = async (event) => {
        if (status !== 'authenticated') return;
        
        trackActivity();
        
        // Clear existing timeout
        if (activityTimeout) clearTimeout(activityTimeout);
        
        // For critical events, send immediate heartbeat
        const criticalEvents = ['mousedown', 'keydown', 'touchstart'];
        const now = Date.now();
        
        if (criticalEvents.includes(event.type) && (now - lastHeartbeat) > 5000) {
          lastHeartbeat = now;
          sendHeartbeat();
        } else {
          // For other events, debounce the heartbeat
          activityTimeout = setTimeout(() => {
            if ((Date.now() - lastHeartbeat) > 10000) {
              sendHeartbeat();
              lastHeartbeat = Date.now();
            }
          }, 2000);
        }
      };

      // Enhanced event listeners for better activity detection
      const events = [
        'mousedown', 'mousemove', 'keydown', 'keypress', 
        'scroll', 'touchstart', 'touchmove', 'click',
        'focus', 'blur'
      ];

      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true });
      });

      // PWA-specific handling
      if ('serviceWorker' in navigator) {
        // Send heartbeat when service worker becomes active
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'BACKGROUND_SYNC') {
            sendHeartbeat();
          }
        });
      }

      // Page unload handling - mark user as going offline
      const handleBeforeUnload = () => {
        // Use sendBeacon for reliable delivery during page unload
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/users/online/offline', JSON.stringify({
            email: session.user.email
          }));
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        // Cleanup
        if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
        if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (activityTimeout) clearTimeout(activityTimeout);
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity);
        });
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [status, session?.user?.email, sendHeartbeat, trackActivity, fetchOnlineUsers]);

  return {
    onlineCount,
    onlineUsers,
    isLoading,
    refreshOnlineUsers: () => fetchOnlineUsers(true),
  };
}