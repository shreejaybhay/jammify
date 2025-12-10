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
      
      // Initial fetch only - GlobalOnlineTracker handles heartbeats
      fetchOnlineUsers(true);

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

      // Simplified visibility change handling - just refresh data
      const handleVisibilityChange = () => {
        if (!document.hidden && status === 'authenticated') {
          // Just refresh the online users data when page becomes visible
          setTimeout(() => fetchOnlineUsers(true), 500);
        }
      };

      // Add minimal event listeners - GlobalOnlineTracker handles heartbeats
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        // Cleanup
        if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
        if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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