"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Heart, Play, ListMusic, Calendar } from "lucide-react";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";

export default function PlaylistsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [likedPlaylistsData, setLikedPlaylistsData] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initialize liked playlists hook
  const { toggleLike: togglePlaylistLike } = useLikedPlaylists(session?.user?.id);

  useEffect(() => {
    const fetchLikedPlaylists = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/liked-playlists?userId=${session.user.id}`);
        const data = await response.json();

        if (data.success) {
          // Fetch additional data for user-created playlists to generate covers
          const playlistsWithCovers = await Promise.all(
            data.data.map(async (likedPlaylist) => {
              // Check if it's a user-created playlist (MongoDB ObjectId format)
              const isUserPlaylist = likedPlaylist.playlistId &&
                likedPlaylist.playlistId.length === 24 &&
                /^[0-9a-fA-F]{24}$/.test(likedPlaylist.playlistId);

              if (isUserPlaylist) {
                try {
                  // Fetch the actual playlist data to get song IDs
                  const playlistResponse = await fetch(`/api/playlists/${likedPlaylist.playlistId}`);
                  const playlistResult = await playlistResponse.json();

                  if (playlistResult.success && playlistResult.data) {
                    // Check if playlist is private and user is not the owner
                    if (!playlistResult.data.isPublic && !playlistResult.data.isOwner) {
                      // Return null to filter out this private playlist
                      return null;
                    }

                    if (playlistResult.data.songIds && playlistResult.data.songIds.length > 0) {
                      // Fetch first few songs for cover generation
                      const songsToFetch = playlistResult.data.songIds.slice(0, 4);
                      const songPromises = songsToFetch.map(async (songId) => {
                        try {
                          const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs?ids=${songId}`);
                          const data = await response.json();
                          if (data.success && data.data && data.data.length > 0) {
                            return data.data[0];
                          }
                          return null;
                        } catch (error) {
                          console.error(`Error fetching song ${songId}:`, error);
                          return null;
                        }
                      });

                      const fetchedSongs = await Promise.all(songPromises);
                      const validSongs = fetchedSongs.filter(song => song !== null);

                      return {
                        ...likedPlaylist,
                        songs: validSongs,
                        actualPlaylistData: playlistResult.data,
                        songCount: playlistResult.data.songIds?.length || 0
                      };
                    } else {
                      // Playlist exists but has no songs
                      return {
                        ...likedPlaylist,
                        songs: [],
                        actualPlaylistData: playlistResult.data,
                        songCount: 0
                      };
                    }
                  } else if (playlistResult.error && playlistResult.error.includes('private')) {
                    // Playlist became private, return null to filter it out
                    return null;
                  }
                } catch (error) {
                  console.error('Error fetching playlist data:', error);
                }
              }

              // Return original data for API playlists or if fetching failed
              return likedPlaylist;
            })
          );

          // Filter out null values (private playlists that user can't access)
          const filteredPlaylists = playlistsWithCovers.filter(playlist => playlist !== null);
          setLikedPlaylistsData(filteredPlaylists);
        }
      } catch (error) {
        console.error('Error fetching liked playlists:', error);
      } finally {
        setHasLoaded(true);
      }
    };

    fetchLikedPlaylists();
  }, [session?.user?.id]);

  const handlePlaylistClick = (playlist) => {
    // Check if it's a user-created playlist (MongoDB ObjectId format) or API playlist
    const isUserPlaylist = playlist.playlistId && playlist.playlistId.length === 24 && /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

    if (isUserPlaylist) {
      // User-created playlist - use /music/playlists/{id}
      router.push(`/music/playlists/${playlist.playlistId}`);
    } else {
      // API playlist - use /music/playlist/{id}
      router.push(`/music/playlist/${playlist.playlistId}`);
    }
  };

  const handleUnlikePlaylist = async (playlist, e) => {
    e.stopPropagation();
    if (!session?.user?.id) return;

    try {
      // Transform the playlist data to match the expected format for the hook
      const playlistForHook = {
        id: playlist.playlistId,
        name: playlist.playlistName,
        description: playlist.description,
        image: playlist.image,
        songCount: playlist.songCount
      };

      await togglePlaylistLike(playlistForHook);
      // Refresh the list
      const response = await fetch(`/api/liked-playlists?userId=${session.user.id}`);
      const data = await response.json();
      if (data.success) {
        setLikedPlaylistsData(data.data);
      }
    } catch (error) {
      console.error('Error unliking playlist:', error);
    }
  };

  // Generate playlist cover based on songs (same logic as other playlist pages)
  const getPlaylistCover = (playlist) => {
    const songs = playlist.songs || [];

    if (!songs || songs.length === 0) {
      return { type: 'default', src: '/def playlist image.jpg' };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      // Use first song's cover image
      const firstSong = songs[0];
      const imageUrl = firstSong.image?.find(img => img.quality === '500x500')?.url ||
        firstSong.image?.find(img => img.quality === '150x150')?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: 'single',
        src: imageUrl || '/def playlist image.jpg',
        song: firstSong
      };
    }

    if (songs.length >= 4) {
      // Create 4-image collage from first 4 songs
      const firstFourSongs = songs.slice(0, 4);
      const images = firstFourSongs.map(song => {
        return song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.find(img => img.quality === '500x500')?.url ||
          song.image?.[song.image.length - 1]?.url ||
          '/def playlist image.jpg';
      });

      return {
        type: 'collage',
        images: images,
        songs: firstFourSongs
      };
    }

    return { type: 'default', src: '/def playlist image.jpg' };
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-3 md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/library">Your Library</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Playlists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-3 md:p-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold mb-2">Liked Playlists</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {likedPlaylistsData.length} playlist{likedPlaylistsData.length !== 1 ? 's' : ''}
            </p>
          </div>

          {hasLoaded && likedPlaylistsData.length === 0 ? (
            <div className="text-center py-12">
              <ListMusic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No liked playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Playlists you like will appear here
              </p>
              <Button onClick={() => router.push('/music/discover')}>
                Discover Music
              </Button>
            </div>
          ) : likedPlaylistsData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {likedPlaylistsData.map((playlist) => (
                <div
                  key={playlist.playlistId || playlist.id}
                  className="group cursor-pointer p-3 md:p-4 rounded-xl bg-card hover:bg-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border border-border/50"
                  onClick={() => handlePlaylistClick(playlist)}
                >
                  <div className="relative mb-2 md:mb-3">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                      {(() => {
                        // Check if it's a user-created playlist with songs data
                        const isUserPlaylist = playlist.playlistId &&
                          playlist.playlistId.length === 24 &&
                          /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

                        if (isUserPlaylist && playlist.songs) {
                          // Use dynamic cover generation for user playlists
                          const cover = getPlaylistCover(playlist);

                          if (cover.type === 'single') {
                            return (
                              <img
                                src={cover.src}
                                alt={playlist.playlistName || 'Playlist'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '/def playlist image.jpg';
                                }}
                              />
                            );
                          } else if (cover.type === 'collage') {
                            return (
                              <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black">
                                {cover.images.map((imageSrc, index) => (
                                  <div key={`collage-${playlist.playlistId}-${index}`} className="w-full h-full overflow-hidden">
                                    <img
                                      src={imageSrc}
                                      alt={`Song ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = '/def playlist image.jpg';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            return (
                              <img
                                src="/def playlist image.jpg"
                                alt={playlist.playlistName || 'Playlist'}
                                className="w-full h-full object-cover"
                              />
                            );
                          }
                        } else if (playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url) {
                          // Use API playlist image for JioSaavn playlists
                          return (
                            <img
                              src={playlist.image[2]?.url || playlist.image[1]?.url || playlist.image[0]?.url}
                              alt={playlist.playlistName || 'Playlist'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          );
                        } else {
                          // Fallback to default icon
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              <ListMusic className="w-8 h-8 md:w-12 md:h-12 opacity-50 text-white" />
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Play button overlay - hidden on mobile, visible on desktop hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                      <Button
                        size="sm"
                        className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistClick(playlist);
                        }}
                      >
                        <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                      </Button>
                    </div>

                    {/* Unlike button - always visible on mobile, hover on desktop */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 md:top-2 md:right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 h-6 w-6 md:h-8 md:w-8 bg-black/50 hover:bg-black/70 text-red-500"
                      onClick={(e) => handleUnlikePlaylist(playlist, e)}
                    >
                      <Heart className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium truncate text-sm md:text-base">
                      {decodeHtmlEntities(playlist.playlistName) || 'Unknown Playlist'}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {playlist.description || 'Playlist'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {playlist.songCount && (
                        <span>{playlist.songCount} songs</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}