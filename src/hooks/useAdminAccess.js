import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Hook to check if current user has admin access
 * @returns {Object} - { isAdmin: boolean, isLoading: boolean, error: string }
 */
export function useAdminAccess() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === 'loading') {
        return; // Wait for session to load
      }

      if (status === 'unauthenticated' || !session?.user?.email) {
        setIsAdmin(false);
        setIsLoading(false);
        setError('Not authenticated');
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

        if (data.success) {
          setIsAdmin(data.isAdmin);
        } else {
          setIsAdmin(false);
          setError(data.error || 'Failed to check admin status');
        }
      } catch (err) {
        console.error('Admin check error:', err);
        setIsAdmin(false);
        setError('Failed to verify admin access');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [session, status]);

  return {
    isAdmin,
    isLoading,
    error,
    // Helper methods
    hasAdminAccess: () => isAdmin && !isLoading && !error,
    isCheckingAccess: () => isLoading,
  };
}