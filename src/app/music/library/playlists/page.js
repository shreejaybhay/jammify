"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [likedPlaylistsData, setLikedPlaylistsData] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initialize liked playlists hook
  const { toggleLike: togglePlaylistLike } = useLikedPlaylists('shree jaybhay');

  useEffect(() => {
    const fetchLikedPlaylists = async () => {
      try {
        const response = await fetch('/api/liked-playlists?userId=shree jaybhay');
        const data = await response.json();

        if (data.success) {
          setLikedPlaylistsData(data.data);
        }
      } catch (error) {
        console.error('Error fetching liked playlists:', error);
      } finally {
        setHasLoaded(true);
      }
    };

    fetchLikedPlaylists();
  }, []);

  const handlePlaylistClick = (playlistId) => {
    router.push(`/music/playlist/${playlistId}`);
  };

  const handleUnlikePlaylist = async (playlist, e) => {
    e.stopPropagation();
    try {
      await togglePlaylistLike(playlist);
      // Refresh the list
      const response = await fetch('/api/liked-playlists?userId=shree jaybhay');
      const data = await response.json();
      if (data.success) {
        setLikedPlaylistsData(data.data);
      }
    } catch (error) {
      console.error('Error unliking playlist:', error);
    }
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
                  key={playlist.id}
                  className="group cursor-pointer p-2 md:p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => handlePlaylistClick(playlist.playlistId)}
                >
                  <div className="relative mb-2 md:mb-3">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                      {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                        <img
                          src={playlist.image[2]?.url || playlist.image[1]?.url || playlist.image[0]?.url}
                          alt={playlist.playlistName || 'Playlist'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-8 h-8 md:w-12 md:h-12 opacity-50 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Play button overlay - hidden on mobile, visible on desktop hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                      <Button
                        size="sm"
                        className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistClick(playlist.playlistId);
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