import { useState, useEffect, useCallback } from 'react';

export function useLikedPlaylists(userId) {
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [likedPlaylistIds, setLikedPlaylistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all liked playlists for the user
  const fetchLikedPlaylists = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/liked-playlists?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setLikedPlaylists(data.data);
        setLikedPlaylistIds(new Set(data.data.map(playlist => playlist.playlistId)));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch liked playlists');
      console.error('Error fetching liked playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Toggle like/unlike a playlist
  const toggleLike = useCallback(async (playlistData) => {
    if (!userId) {
      setError('User ID is required');
      return { success: false, error: 'User ID is required' };
    }
    
    try {
      const response = await fetch('/api/liked-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          playlistData
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        if (result.liked) {
          // Playlist was liked
          setLikedPlaylistIds(prev => new Set([...prev, playlistData.id]));
          setLikedPlaylists(prev => [{
            playlistId: playlistData.id,
            playlistName: playlistData.name || playlistData.title,
            description: playlistData.description || '',
            image: playlistData.image,
            songCount: playlistData.songCount || playlistData.song_count || 0,
            likedAt: new Date().toISOString()
          }, ...prev]);
        } else {
          // Playlist was unliked
          setLikedPlaylistIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(playlistData.id);
            return newSet;
          });
          setLikedPlaylists(prev => prev.filter(playlist => playlist.playlistId !== playlistData.id));
        }
        
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to toggle playlist like';
      setError(errorMsg);
      console.error('Error toggling playlist like:', err);
      return { success: false, error: errorMsg };
    }
  }, [userId]);

  // Check if a playlist is liked
  const isLiked = useCallback((playlistId) => {
    return likedPlaylistIds.has(playlistId);
  }, [likedPlaylistIds]);

  // Get liked playlist count
  const getLikedCount = useCallback(() => {
    return likedPlaylists.length;
  }, [likedPlaylists]);

  // Initialize - fetch liked playlists when userId changes
  useEffect(() => {
    fetchLikedPlaylists();
  }, [fetchLikedPlaylists]);

  return {
    likedPlaylists,
    loading,
    error,
    toggleLike,
    isLiked,
    getLikedCount,
    refetch: fetchLikedPlaylists
  };
}