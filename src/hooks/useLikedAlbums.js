import { useState, useEffect, useCallback } from 'react';

export function useLikedAlbums(userId) {
  const [likedAlbums, setLikedAlbums] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all liked albums for the user
  const fetchLikedAlbums = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/liked-albums?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      
      if (data.success) {
        const albumIds = new Set(data.data.map(album => album.albumId));
        setLikedAlbums(albumIds);
      }
    } catch (error) {
      console.error('Error fetching liked albums:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check if an album is liked
  const isLiked = useCallback((albumId) => {
    return likedAlbums.has(albumId);
  }, [likedAlbums]);

  // Toggle like status for an album
  const toggleLike = useCallback(async (albumData) => {
    if (!userId || !albumData) {
      throw new Error('User ID and album data are required');
    }

    // Optimistic update - update UI immediately
    const wasLiked = likedAlbums.has(albumData.id);
    const willBeLiked = !wasLiked;
    
    // Update local state optimistically
    setLikedAlbums(prev => {
      const newSet = new Set(prev);
      if (willBeLiked) {
        newSet.add(albumData.id);
      } else {
        newSet.delete(albumData.id);
      }
      return newSet;
    });

    try {
      const response = await fetch('/api/liked-albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          albumData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Server confirmed the operation, no need to update state again
        // as we already did optimistic update
        return result;
      } else {
        // Server operation failed, revert optimistic update
        setLikedAlbums(prev => {
          const newSet = new Set(prev);
          if (wasLiked) {
            newSet.add(albumData.id);
          } else {
            newSet.delete(albumData.id);
          }
          return newSet;
        });
        
        throw new Error(result.error || 'Failed to toggle album like');
      }
    } catch (error) {
      // Network error, revert optimistic update
      setLikedAlbums(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(albumData.id);
        } else {
          newSet.delete(albumData.id);
        }
        return newSet;
      });
      
      console.error('Error toggling album like:', error);
      throw error;
    }
  }, [userId, likedAlbums]);

  // Check if a specific album is liked (useful for individual checks)
  const checkIsLiked = useCallback(async (albumId) => {
    if (!userId || !albumId) return false;
    
    try {
      const response = await fetch(`/api/liked-albums/check?userId=${encodeURIComponent(userId)}&albumId=${encodeURIComponent(albumId)}`);
      const data = await response.json();
      
      if (data.success) {
        return data.isLiked;
      }
      return false;
    } catch (error) {
      console.error('Error checking if album is liked:', error);
      return false;
    }
  }, [userId]);

  // Fetch liked albums on mount
  useEffect(() => {
    fetchLikedAlbums();
  }, [fetchLikedAlbums]);

  return {
    likedAlbums: Array.from(likedAlbums),
    isLiked,
    toggleLike,
    checkIsLiked,
    loading,
    refetch: fetchLikedAlbums
  };
}