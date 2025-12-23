"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Music, Lock, Unlock } from "lucide-react"

export default function PlaylistsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch user's playlists with song data for covers
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (status !== "authenticated" || !session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/playlists');
        const result = await response.json();

        if (result.success) {
          // Fetch song data for each playlist to generate covers
          const playlistsWithCovers = await Promise.all(
            result.data.map(async (playlist) => {
              if (playlist.songIds && playlist.songIds.length > 0) {
                try {
                  // Fetch first few songs for cover generation
                  const songsToFetch = playlist.songIds.slice(0, 4);
                  const songPromises = songsToFetch.map(async (songId) => {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${songId}`);
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
                    ...playlist,
                    songs: validSongs
                  };
                } catch (error) {
                  console.error('Error fetching songs for playlist:', error);
                  return playlist;
                }
              }
              return playlist;
            })
          );

          setPlaylists(playlistsWithCovers);
        } else {
          console.error('Failed to fetch playlists:', result.error);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    };

    fetchPlaylists();
  }, [session, status]);

  const handleCreatePlaylist = async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to the new playlist page
        router.push(`/music/playlists/${result.data._id}`);
      } else {
        console.error('Failed to create playlist:', result.error);
        alert('Failed to create playlist. Please try again.');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Generate playlist cover based on songs (same logic as detail page)
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">
                      Music
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>My Playlists</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <Button
              onClick={handleCreatePlaylist}
              disabled={isCreating || status !== "authenticated"}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden xs:inline">Creating...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Create Playlist</span>
                  <span className="xs:hidden">Create</span>
                </>
              )}
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
             
            </div>
          ) : hasLoaded && playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="w-16 h-16 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">Create your first playlist to get started</p>
              <Button onClick={handleCreatePlaylist} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">My Playlists</h2>
                <p className="text-muted-foreground">
                  {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {playlists.map((playlist) => (
                  <div
                    key={playlist._id}
                    onClick={() => router.push(`/music/playlists/${playlist._id}`)}
                    className="group cursor-pointer bg-card rounded-lg p-4 hover:bg-muted/20 transition-all duration-200"
                  >
                    <div className="aspect-square mb-3 relative">
                      {(() => {
                        const cover = getPlaylistCover(playlist);

                        if (cover.type === 'single') {
                          return (
                            <img
                              src={cover.src}
                              alt={playlist.name}
                              className="w-full h-full object-cover rounded-md shadow-md group-hover:shadow-lg transition-shadow"
                              onError={(e) => {
                                e.target.src = '/def playlist image.jpg';
                              }}
                            />
                          );
                        } else if (cover.type === 'collage') {
                          return (
                            <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black rounded-md overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                              {cover.images.map((imageSrc, index) => (
                                <div key={index} className="w-full h-full overflow-hidden">
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
                              alt={playlist.name}
                              className="w-full h-full object-cover rounded-md shadow-md group-hover:shadow-lg transition-shadow"
                            />
                          );
                        }
                      })()}
                      <div className="absolute top-2 right-2">
                        {playlist.isPublic ? (
                          <Badge variant="secondary" className="text-xs">
                            <Unlock className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {playlist.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {playlist.songIds?.length || 0} songs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(playlist.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}