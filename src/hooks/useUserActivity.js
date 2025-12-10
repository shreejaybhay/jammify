"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useUserActivity(options = {}) {
  const { 
    enabled = true,
    recordOnMount = true,
    recordOnFocus = true,
    recordOnVisibilityChange = true,
    debounceMs = 5000 // Prevent too frequent calls
  } = options;
  
  const { data: session, status } = useSession();
  const lastRecordedRef = useRef(0);
  const isRecordingRef = useRef(false);

  const recordActivity = async (source = 'manual') => {
    // Check if we should record
    if (!enabled || status !== 'authenticated' || !session?.user?.email) {
      return;
    }

    // Debounce to prevent too frequent calls
    const now = Date.now();
    if (now - lastRecordedRef.current < debounceMs) {
      return;
    }

    // Prevent concurrent requests
    if (isRecordingRef.current) {
      return;
    }

    try {
      isRecordingRef.current = true;
      lastRecordedRef.current = now;

      const response = await fetch('/api/analytics/record-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 User activity recorded (${source}):`, result);
      }
      
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to record user activity:', error);
      }
    } finally {
      isRecordingRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    // Record activity on mount
    if (recordOnMount) {
      recordActivity('mount');
    }

    // Record activity on window focus
    const handleFocus = () => {
      if (recordOnFocus) {
        recordActivity('focus');
      }
    };

    // Record activity on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (recordOnVisibilityChange && !document.hidden) {
        recordActivity('visibility');
      }
    };

    // Add event listeners
    if (recordOnFocus) {
      window.addEventListener('focus', handleFocus);
    }
    
    if (recordOnVisibilityChange) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Cleanup
    return () => {
      if (recordOnFocus) {
        window.removeEventListener('focus', handleFocus);
      }
      
      if (recordOnVisibilityChange) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, status, session, recordOnMount, recordOnFocus, recordOnVisibilityChange]);

  return {
    recordActivity,
    isAuthenticated: status === 'authenticated',
    canRecord: enabled && status === 'authenticated' && !!session?.user?.email
  };
}