import { useState, useEffect, useCallback } from 'react';

export function useLikedSongs(userId) {
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedSongIds, setLikedSongIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all liked songs for the user
  const fetchLikedSongs = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/liked-songs?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setLikedSongs(data.data);
        setLikedSongIds(new Set(data.data.map(song => song.songId)));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch liked songs');
      console.error('Error fetching liked songs:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Toggle like/unlike a song
  const toggleLike = useCallback(async (songData) => {
    if (!userId) {
      setError('User ID is required');
      return { success: false, error: 'User ID is required' };
    }
    
    try {
      const response = await fetch('/api/liked-songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          songData
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        if (result.liked) {
          // Song was liked
          setLikedSongIds(prev => new Set([...prev, songData.id]));
          setLikedSongs(prev => [{
            songId: songData.id,
            songName: songData.name,
            artists: songData.artists?.primary || [],
            album: songData.album,
            duration: songData.duration,
            image: songData.image,
            releaseDate: songData.releaseDate,
            language: songData.language,
            likedAt: new Date().toISOString()
          }, ...prev]);
        } else {
          // Song was unliked
          setLikedSongIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(songData.id);
            return newSet;
          });
          setLikedSongs(prev => prev.filter(song => song.songId !== songData.id));
        }
        
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to toggle like';
      setError(errorMsg);
      console.error('Error toggling like:', err);
      return { success: false, error: errorMsg };
    }
  }, [userId]);

  // Check if a song is liked
  const isLiked = useCallback((songId) => {
    return likedSongIds.has(songId);
  }, [likedSongIds]);

  // Get liked song count
  const getLikedCount = useCallback(() => {
    return likedSongs.length;
  }, [likedSongs]);

  // Initialize - fetch liked songs when userId changes
  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  return {
    likedSongs,
    loading,
    error,
    toggleLike,
    isLiked,
    getLikedCount,
    refetch: fetchLikedSongs
  };
}