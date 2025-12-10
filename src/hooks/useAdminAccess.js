import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Global cache to prevent multiple admin checks for the same user
const adminCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if current user has admin access with caching
 * @returns {Object} - { isAdmin: boolean, isLoading: boolean, error: string }
 */
export function useAdminAccess() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkedEmailRef = useRef(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === 'loading') {
        return; // Wait for session to load
      }

      if (status === 'unauthenticated' || !session?.user?.email) {
        setIsAdmin(false);
        setIsLoading(false);
        setError('Not authenticated');
        checkedEmailRef.current = null;
        return;
      }

      const userEmail = session.user.email;
      
      // Prevent re-checking for the same user
      if (checkedEmailRef.current === userEmail) {
        return;
      }

      // Check cache first
      const cacheKey = `admin_${userEmail}`;
      const cached = adminCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        setIsAdmin(cached.isAdmin);
        setIsLoading(false);
        setError(cached.error);
        checkedEmailRef.current = userEmail;
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/check', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        let adminStatus = false;
        let errorMessage = null;

        if (data.success) {
          adminStatus = data.isAdmin;
        } else {
          errorMessage = data.error || 'Failed to check admin status';
        }

        // Cache the result
        adminCache.set(cacheKey, {
          isAdmin: adminStatus,
          error: errorMessage,
          timestamp: Date.now()
        });

        setIsAdmin(adminStatus);
        setError(errorMessage);
        checkedEmailRef.current = userEmail;

      } catch (err) {
        console.error('Admin check error:', err);
        const errorMessage = 'Failed to verify admin access';
        
        // Cache the error result too (shorter duration)
        adminCache.set(cacheKey, {
          isAdmin: false,
          error: errorMessage,
          timestamp: Date.now() - (CACHE_DURATION - 30000) // Cache errors for 30 seconds only
        });

        setIsAdmin(false);
        setError(errorMessage);
        checkedEmailRef.current = userEmail;
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [status, session?.user?.email]); // Only depend on email, not entire session object

  return {
    isAdmin,
    isLoading,
    error,
    // Helper methods
    hasAdminAccess: () => isAdmin && !isLoading && !error,
    isCheckingAccess: () => isLoading,
    // Method to clear cache if needed
    clearCache: () => {
      if (session?.user?.email) {
        adminCache.delete(`admin_${session.user.email}`);
        checkedEmailRef.current = null;
      }
    }
  };
}