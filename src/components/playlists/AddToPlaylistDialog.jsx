/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Music, Check, Loader2, X, ListMusic } from "lucide-react";

export function AddToPlaylistDialog({ open, onOpenChange, song }) {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingToPlaylist, setAddingToPlaylist] = useState(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Fetch user's playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!open || !session?.user?.id) return;

      setLoading(true);
      try {
        const response = await fetch('/api/playlists');
        const result = await response.json();

        if (result.success) {
          setPlaylists(result.data);
        } else {
          console.error('Failed to fetch playlists:', result.error);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [open, session]);

  // Filter playlists based on search query
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create new playlist and add song
  const handleCreatePlaylist = async () => {
    if (!session?.user?.id || !song) return;

    setCreatingPlaylist(true);
    try {
      // First create the playlist
      const createResponse = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const createResult = await createResponse.json();

      if (createResult.success) {
        // Then add the song to the new playlist
        const correctSongId = getCorrectSongId(song);
        
        const addResponse = await fetch(`/api/playlists/${createResult.data._id}/songs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            songId: correctSongId
          }),
        });

        const addResult = await addResponse.json();

        if (addResult.success) {
          // Refresh playlists list
          const refreshResponse = await fetch('/api/playlists');
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setPlaylists(refreshResult.data);
          }
          
          // Close dialog
          onOpenChange(false);
          console.log(`Song added to new playlist: ${createResult.data.name}`);
        } else {
          console.error('Failed to add song to new playlist:', addResult.error);
        }
      } else {
        console.error('Failed to create playlist:', createResult.error);
      }
    } catch (error) {
      console.error('Error creating playlist and adding song:', error);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // Helper function to get the correct JioSaavn song ID
  const getCorrectSongId = (song) => {
    // If it's a JioSaavn song object with short ID, use it
    if (song.id && typeof song.id === 'string' && song.id.length < 20) {
      return song.id; // This is the JioSaavn ID like "FB8WBiWv"
    }
    // If it's from liked songs, extract the correct ID from the song name or other fields
    // For now, we'll need to fetch the correct ID from JioSaavn API
    return song.songId || song.id;
  };

  // Add song to existing playlist
  const handleAddToPlaylist = async (playlistId) => {
    if (!song) return;

    setAddingToPlaylist(playlistId);
    try {
      // Get the correct song ID
      let correctSongId = getCorrectSongId(song);
      
      // If we have a long ID (likely MongoDB ObjectId), we need to find the correct JioSaavn ID
      if (correctSongId && correctSongId.length > 15) {
        console.log('Long ID detected, need to find correct JioSaavn ID for:', song.songName);
        // For now, we'll use the ID as is, but this should be fixed at the source
        // TODO: Implement proper ID mapping or fetch correct ID from JioSaavn
      }

      const response = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: correctSongId
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the playlist in local state to show it contains the song
        setPlaylists(prev => prev.map(playlist => 
          playlist._id === playlistId 
            ? { ...playlist, songIds: [...(playlist.songIds || []), song.id || song.songId] }
            : playlist
        ));
        
        // Close dialog after a brief delay to show success
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
        
        console.log(`Song added to playlist: ${result.message}`);
      } else {
        console.error('Failed to add song to playlist:', result.error);
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    } finally {
      setAddingToPlaylist(null);
    }
  };

  // Check if song is already in playlist
  const isSongInPlaylist = (playlist) => {
    const songId = getCorrectSongId(song);
    return playlist.songIds?.includes(songId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] h-[85vh] max-h-[600px] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl font-semibold">Add to playlist</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1 truncate">
            Choose a playlist to add "{song?.title || song?.name || song?.songName || 'this song'}" to
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Find a playlist"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base border-2 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Create New Playlist */}
        <div className="flex-shrink-0 px-4 sm:px-6 pb-3">
          <Button
            variant="outline"
            className="w-full justify-start h-12 sm:h-14 px-4 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all duration-200"
            onClick={handleCreatePlaylist}
            disabled={creatingPlaylist}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
              {creatingPlaylist ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm sm:text-base">
                {creatingPlaylist ? "Creating playlist..." : "New playlist"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Create a new playlist with this song
              </p>
            </div>
          </Button>
        </div>

        <Separator className="mx-4 sm:mx-6" />

        {/* Playlists List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 pt-3 sm:pt-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Loading playlists...</p>
                </div>
              ) : filteredPlaylists.length > 0 ? (
                <div className="space-y-2">
                  {filteredPlaylists.map((playlist) => {
                    const isAdding = addingToPlaylist === playlist._id;
                    const songInPlaylist = isSongInPlaylist(playlist);
                    
                    return (
                      <Button
                        key={playlist._id}
                        variant="ghost"
                        className={`w-full justify-start h-14 sm:h-16 px-3 sm:px-4 rounded-lg transition-all duration-200 ${
                          songInPlaylist 
                            ? 'bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border border-green-200 dark:border-green-800' 
                            : 'hover:bg-accent/50 hover:scale-[1.02]'
                        }`}
                        onClick={() => !songInPlaylist && !isAdding && handleAddToPlaylist(playlist._id)}
                        disabled={isAdding || songInPlaylist}
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 transition-colors ${
                          songInPlaylist 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : 'bg-muted'
                        }`}>
                          {songInPlaylist ? (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                          ) : isAdding ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" />
                          ) : (
                            <ListMusic className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm sm:text-base truncate">{playlist.name}</p>
                            {songInPlaylist && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {playlist.songIds?.length || 0} song{(playlist.songIds?.length || 0) !== 1 ? 's' : ''}
                            {playlist.isPublic === false && (
                              <span className="ml-2 inline-flex items-center">
                                • Private
                              </span>
                            )}
                          </p>
                        </div>
                        {isAdding && (
                          <div className="ml-2 text-xs text-muted-foreground">
                            Adding...
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    {searchQuery ? (
                      <Search className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    ) : (
                      <ListMusic className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-medium text-muted-foreground mb-1">
                    {searchQuery ? 'No playlists found' : 'No playlists yet'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {searchQuery 
                      ? `Try searching for something else or create a new playlist` 
                      : 'Create your first playlist to get started'
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer hint for mobile */}
        <div className="flex-shrink-0 p-4 sm:p-6 pt-2 border-t bg-muted/20 sm:hidden">
          <p className="text-xs text-center text-muted-foreground">
            Tap outside to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}