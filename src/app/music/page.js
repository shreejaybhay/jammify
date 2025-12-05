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
import { Badge } from "@/components/ui/badge";
import { Play, Heart, List } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";

export default function MusicPage() {
  const router = useRouter();
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistColors, setPlaylistColors] = useState({});
  
  // Initialize liked songs hook to show count
  const { likedSongs, getLikedCount } = useLikedSongs('shree jaybhay');
  
  // Initialize liked playlists hook
  const { likedPlaylists, loading: playlistsLoading } = useLikedPlaylists('shree jaybhay');

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=new%20releases&page=0&limit=6`);
        const data = await response.json();

        if (data.success && data.data.results) {
          setNewReleases(data.data.results);
        }
      } catch (error) {
        console.error('Error fetching new releases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewReleases();
  }, []);

  const handlePlayClick = (item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  };

  const handleCardClick = (item, type) => {
    if (type === "playlist" && typeof item === "object" && item.id) {
      // Navigate to playlist detail page with songCount
      router.push(`/music/playlist/${item.id}?songCount=${item.songCount || 50}`);
    } else {
      console.log(`Clicked ${type}:`, item);
    }
  };

  const handleShowAll = () => {
    // Navigate to existing new releases page
    router.push('/music/discover/new-releases');
  };

  // Extract dominant color from image
  const extractDominantColor = (imageUrl, playlistId) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const colorCounts = {};

          // Sample every 10th pixel for performance
          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very light or very dark colors
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 220) continue;

            const color = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15},${Math.floor(b / 15) * 15}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          // Find the most common color
          let dominantColor = '59,130,246'; // Default blue
          let maxCount = 0;

          for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantColor = color;
            }
          }

          const rgbColor = `rgb(${dominantColor})`;
          setPlaylistColors(prev => ({
            ...prev,
            [playlistId]: rgbColor
          }));
          resolve(rgbColor);
        } catch (error) {
          console.error('Error extracting color:', error);
          const fallbackColor = 'rgb(59,130,246)';
          setPlaylistColors(prev => ({
            ...prev,
            [playlistId]: fallbackColor
          }));
          resolve(fallbackColor);
        }
      };

      img.onerror = () => {
        const fallbackColor = 'rgb(59,130,246)';
        setPlaylistColors(prev => ({
          ...prev,
          [playlistId]: fallbackColor
        }));
        resolve(fallbackColor);
      };

      img.src = imageUrl;
    });
  };

  // Extract colors when playlists load
  useEffect(() => {
    if (!playlistsLoading && likedPlaylists.length > 0) {
      likedPlaylists.slice(0, 5).forEach((playlist) => {
        const imageUrl = playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url;
        if (imageUrl && !playlistColors[playlist.playlistId]) {
          extractDominantColor(imageUrl, playlist.playlistId);
        }
      });
    }
  }, [likedPlaylists, playlistsLoading]);


  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
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
                  <BreadcrumbPage>Discover</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Quick Access Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Liked Songs */}
            <div
              className="rounded-lg p-4 relative overflow-hidden cursor-pointer transition-all duration-300 flex items-center gap-3 h-20 group"
              style={{
                backgroundColor: 'rgba(147, 51, 234, 0.15)', // Purple ambient
                '--hover-color': 'rgba(147, 51, 234, 0.25)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.15)';
              }}
              onClick={() => router.push('/music/favorites')}
            >
              <div className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0 shadow-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgb(147, 51, 234), rgba(147, 51, 234, 0.8))'
                }}
              >
                <Heart className="w-6 h-6 fill-current text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">Liked Songs</h3>
              </div>
              
              {/* Play button overlay */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  className="rounded-full w-10 h-10 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick({ type: 'liked-songs' }, "liked-songs");
                  }}
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>

            {/* Dynamic Liked Playlists */}
            {playlistsLoading ? (
              // Loading skeleton for playlists
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="bg-muted/50 rounded-lg p-4 flex items-center gap-3 h-20 animate-pulse">
                  <div className="w-12 h-12 bg-gray-300 rounded-sm shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : (
              likedPlaylists.slice(0, 5).map((playlist) => {
                const dominantColor = playlistColors[playlist.playlistId] || 'rgb(59,130,246)';
                const rgbValues = dominantColor.match(/\d+/g);
                const ambientColor = rgbValues ? `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.15)` : 'rgba(59,130,246,0.15)';
                const hoverColor = rgbValues ? `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.25)` : 'rgba(59,130,246,0.25)';
                
                return (
                  <div
                    key={playlist.playlistId}
                    className="rounded-lg p-4 relative overflow-hidden cursor-pointer transition-all duration-300 flex items-center gap-3 h-20 group"
                    style={{
                      backgroundColor: ambientColor,
                      '--hover-color': hoverColor
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = hoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = ambientColor;
                    }}
                    onClick={() => router.push(`/music/playlist/${playlist.playlistId}?songCount=${playlist.songCount || 50}`)}
                  >
                    <div className="w-12 h-12 rounded-sm shrink-0 shadow-lg overflow-hidden">
                      {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                        <img
                          src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                          alt={playlist.playlistName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center" 
                        style={{ 
                          display: playlist.image?.[0]?.url ? 'none' : 'flex',
                          background: `linear-gradient(135deg, ${dominantColor}, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')})`
                        }}
                      >
                        <List className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {playlist.playlistName}
                      </h3>
                    </div>
                    
                    {/* Play button overlay */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        className="rounded-full w-10 h-10 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayClick(playlist, "playlist");
                        }}
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* It's New Music Friday Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">It's New Music Friday!</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowAll}
              >
                Show all
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-gray-300 animate-pulse rounded-lg aspect-square" />
                    <div className="bg-gray-300 animate-pulse h-4 rounded" />
                    <div className="bg-gray-300 animate-pulse h-3 rounded w-2/3" />
                  </div>
                ))
              ) : (
                newReleases.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleCardClick(playlist, "playlist")}
                  >
                    <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                      <img
                        src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-music.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Button
                        size="icon"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 rounded-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayClick(playlist, "playlist");
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.songCount} songs
                      </p>
                    </div>
                  </div>
                ))
              )}


            </div>
          </div>


        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
