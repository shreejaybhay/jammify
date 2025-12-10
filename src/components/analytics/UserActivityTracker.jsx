// Updated UserActivityTracker.jsx
"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function UserActivityTracker({ 
  enabled = true,
  recordOnMount = true,
  recordOnFocus = true,
  recordOnVisibilityChange = true 
}) {
  const { data: session, status } = useSession();
  const hasRecordedToday = useRef(false);
  const isRecording = useRef(false);
  const lastRecordedDate = useRef(null);

  const recordActivity = async (source = 'manual') => {
    // Check if we should record
    if (!enabled || status !== 'authenticated' || !session?.user?.email) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already recorded today
    if (hasRecordedToday.current && lastRecordedDate.current === today) {
      return;
    }

    // Prevent concurrent requests
    if (isRecording.current) {
      return;
    }

    try {
      isRecording.current = true;

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
      
      if (result.success) {
        hasRecordedToday.current = true;
        lastRecordedDate.current = today;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 User activity recorded (${source}):`, result);
        }
      }
      
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to record user activity:', error);
      }
    } finally {
      isRecording.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    // Reset daily flag if date changed
    const today = new Date().toISOString().split('T')[0];
    if (lastRecordedDate.current !== today) {
      hasRecordedToday.current = false;
    }

    // Record activity on mount (only once per day)
    if (recordOnMount && !hasRecordedToday.current) {
      recordActivity('mount');
    }

    // Record activity on window focus
    const handleFocus = () => {
      if (recordOnFocus && !hasRecordedToday.current) {
        recordActivity('focus');
      }
    };

    // Record activity on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (recordOnVisibilityChange && !document.hidden && !hasRecordedToday.current) {
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

  // This component renders nothing - it just tracks activity
  return null;
}
