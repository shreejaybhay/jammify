import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useOnlineStatus() {
  const { data: session, status } = useSession();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeIntervalRef = useRef(null);
  const fetchIntervalRef = useRef(null);

  // Update user's last active timestamp
  const updateLastActive = useCallback(async () => {
    if (!session?.user?.email || status !== 'authenticated') {
      console.log('Skipping update - no session or not authenticated');
      return;
    }
    
    try {
      console.log('Updating last active for:', session.user.email);
      const response = await fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('Update response:', data);
      
      if (!data.success) {
        console.error('Failed to update last active:', data.error);
      }
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }, [session?.user?.email, status]);

  // Fetch online users count
  const fetchOnlineUsers = useCallback(async (includeList = false) => {
    try {
      console.log('Fetching online users...');
      const response = await fetch(`/api/users/online?includeList=${includeList}`);
      const data = await response.json();
      
      console.log('Fetch response:', data);
      
      if (data.success) {
        setOnlineCount(data.onlineCount);
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
      } else {
        console.error('Failed to fetch online users:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clear any existing intervals
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);

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
      console.log('Setting up online tracking for:', session.user.email);
      
      // Initial update and fetch with proper sequencing
      const initializeTracking = async () => {
        // First update the user's lastActive
        await updateLastActive();
        // Wait a moment for the database to update
        setTimeout(() => {
          // Then fetch the online users to include this user
          fetchOnlineUsers();
        }, 500);
      };
      
      initializeTracking();

      // Update last active every 30 seconds
      activeIntervalRef.current = setInterval(() => {
        updateLastActive();
      }, 30000);

      // Fetch online count every 10 seconds
      fetchIntervalRef.current = setInterval(() => {
        fetchOnlineUsers();
      }, 10000);

      // Update on page visibility change
      const handleVisibilityChange = () => {
        if (!document.hidden && status === 'authenticated') {
          updateLastActive().then(() => {
            setTimeout(() => fetchOnlineUsers(), 300);
          });
        }
      };

      // Update on user interaction (throttled to prevent too many calls)
      let activityTimeout;
      const handleUserActivity = () => {
        if (status !== 'authenticated') return;
        if (activityTimeout) clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
          updateLastActive();
        }, 1000); // Throttle to max once per second
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('mousedown', handleUserActivity);
      document.addEventListener('keydown', handleUserActivity);
      document.addEventListener('scroll', handleUserActivity);
      document.addEventListener('touchstart', handleUserActivity);

      return () => {
        if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
        if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
        if (activityTimeout) clearTimeout(activityTimeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('mousedown', handleUserActivity);
        document.removeEventListener('keydown', handleUserActivity);
        document.removeEventListener('scroll', handleUserActivity);
        document.removeEventListener('touchstart', handleUserActivity);
      };
    }
  }, [status, session?.user?.email]);

  return {
    onlineCount,
    onlineUsers,
    isLoading,
    refreshOnlineUsers: () => fetchOnlineUsers(true),
  };
}