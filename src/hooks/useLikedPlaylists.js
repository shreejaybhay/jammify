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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(text);
      
      if (data.success) {
        // Separate user-created playlists from API playlists
        const userPlaylistIds = [];
        const apiPlaylists = [];
        
        data.data.forEach(playlist => {
          const isUserPlaylist = playlist.playlistId && 
            playlist.playlistId.length === 24 && 
            /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);
          
          if (isUserPlaylist) {
            userPlaylistIds.push(playlist.playlistId);
          } else {
            // API playlists are always public
            apiPlaylists.push(playlist);
          }
        });
        
        let accessiblePlaylists = [...apiPlaylists];
        
        // Batch check accessibility for user-created playlists
        if (userPlaylistIds.length > 0) {
          try {
            const batchResponse = await fetch('/api/playlists/batch-check', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                playlistIds: userPlaylistIds,
                userId
              }),
            });
            
            const batchResult = await batchResponse.json();
            
            if (batchResult.success) {
              // Filter playlists based on batch accessibility check
              const accessibleUserPlaylists = data.data.filter(playlist => {
                const isUserPlaylist = playlist.playlistId && 
                  playlist.playlistId.length === 24 && 
                  /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);
                
                if (!isUserPlaylist) return false;
                
                const accessibilityInfo = batchResult.data.find(
                  item => item.playlistId === playlist.playlistId
                );
                
                return accessibilityInfo?.isAccessible === true;
              });
              
              accessiblePlaylists = [...apiPlaylists, ...accessibleUserPlaylists];
            } else {
              console.error('Batch accessibility check failed:', batchResult.error);
              // Fallback: include all playlists if batch check fails
              accessiblePlaylists = data.data;
            }
          } catch (error) {
            console.error('Error in batch accessibility check:', error);
            // Fallback: include all playlists if batch check fails
            accessiblePlaylists = data.data;
          }
        }
        
        setLikedPlaylists(accessiblePlaylists);
        setLikedPlaylistIds(new Set(accessiblePlaylists.map(playlist => playlist.playlistId)));
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