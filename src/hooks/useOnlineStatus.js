import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useOnlineStatus() {
  const { data: session } = useSession();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update user's last active timestamp
  const updateLastActive = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      await fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to update last active:', error);
    }
  }, [session]);

  // Fetch online users count
  const fetchOnlineUsers = useCallback(async (includeList = false) => {
    try {
      const response = await fetch(`/api/users/online?includeList=${includeList}`);
      const data = await response.json();
      
      if (data.success) {
        setOnlineCount(data.onlineCount);
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
      }
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    // Initial update and fetch
    updateLastActive();
    fetchOnlineUsers();

    // Update last active every 30 seconds
    const activeInterval = setInterval(updateLastActive, 30000);

    // Fetch online count every 10 seconds
    const fetchInterval = setInterval(() => fetchOnlineUsers(), 10000);

    // Update on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateLastActive();
        fetchOnlineUsers();
      }
    };

    // Update on user interaction
    const handleUserActivity = () => {
      updateLastActive();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    return () => {
      clearInterval(activeInterval);
      clearInterval(fetchInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
    };
  }, [session, updateLastActive, fetchOnlineUsers]);

  return {
    onlineCount,
    onlineUsers,
    isLoading,
    refreshOnlineUsers: () => fetchOnlineUsers(true),
  };
}