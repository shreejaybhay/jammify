"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Global Online Tracker Component
 * This component runs on every page to track user activity and maintain online status
 * It's lightweight and only handles heartbeat - no UI rendering
 */
export function GlobalOnlineTracker() {
  const { data: session, status } = useSession();
  const heartbeatIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(0);

  // Lightweight heartbeat function - only sends updates, no state management
  const sendHeartbeat = useCallback(async (isImmediate = false) => {
    if (!session?.user?.email || status !== 'authenticated') {
      return false;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          isImmediate,
          source: 'global-tracker'
        }),
        signal: controller.signal,
        keepalive: true,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        lastActivityRef.current = Date.now();
        lastHeartbeatRef.current = Date.now();
        return true;
      }
      
      return false;
    } catch (error) {
      // Silently handle errors to avoid console spam
      return false;
    }
  }, [session?.user?.email, status]);

  // Track user activity
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Clear existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !session?.user?.email) {
      return;
    }

    // Only proceed if authenticated
    if (status === 'authenticated' && session?.user?.email) {
      // Send initial heartbeat
      sendHeartbeat(true);

      // Regular heartbeat every 20 seconds
      heartbeatIntervalRef.current = setInterval(async () => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        
        // Only send heartbeat if user was active in last 3 minutes
        if (timeSinceActivity < 3 * 60 * 1000) {
          await sendHeartbeat();
        }
      }, 20000);

      // Enhanced activity tracking
      let activityTimeout;
      
      const handleUserActivity = async (event) => {
        if (status !== 'authenticated') return;
        
        trackActivity();
        
        // Clear existing timeout
        if (activityTimeout) clearTimeout(activityTimeout);
        
        // For critical events, send immediate heartbeat
        const criticalEvents = ['mousedown', 'keydown', 'touchstart'];
        const now = Date.now();
        
        if (criticalEvents.includes(event.type) && (now - lastHeartbeatRef.current) > 10000) {
          sendHeartbeat();
        } else {
          // For other events, debounce the heartbeat
          activityTimeout = setTimeout(() => {
            if ((Date.now() - lastHeartbeatRef.current) > 15000) {
              sendHeartbeat();
            }
          }, 3000);
        }
      };

      // Activity detection events
      const events = [
        'mousedown', 'mousemove', 'keydown', 'keypress', 
        'scroll', 'touchstart', 'touchmove', 'click',
        'focus', 'blur'
      ];

      // Visibility change handling
      const handleVisibilityChange = async () => {
        if (!document.hidden && status === 'authenticated') {
          trackActivity();
          await sendHeartbeat(true);
        }
      };

      // Page unload handling
      const handleBeforeUnload = () => {
        if (navigator.sendBeacon && session?.user?.email) {
          navigator.sendBeacon('/api/users/online/offline', JSON.stringify({
            email: session.user.email
          }));
        }
      };

      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true });
      });

      // PWA support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'BACKGROUND_SYNC') {
            sendHeartbeat();
          }
        });
      }

      return () => {
        // Cleanup
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity);
        });
      };
    }
  }, [status, session?.user?.email, sendHeartbeat, trackActivity]);

  // This component doesn't render anything - it's just for tracking
  return null;
}