"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Play, ArrowLeft, Heart, MoreHorizontal, Clock, Shuffle, Calendar, Disc } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";

export default function AlbumPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = params.id;

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [dominantColor, setDominantColor] = useState('rgb(34, 197, 94)'); // Default green
  
  // Initialize liked songs hook with actual user name
  const { toggleLike, isLiked } = useLikedSongs('shree jaybhay');
  
  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching album ${albumId}`);
        
        const albumResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/albums?id=${albumId}`);
        const albumData = await albumResponse.json();

        if (albumData.success && albumData.data) {
          console.log(`Fetched album "${albumData.data.name}" with ${albumData.data.songs?.length || 0} songs`);
          
          // Extract dominant color from album image
          let extractedColor = 'rgb(34, 197, 94)'; // Default green
          const imageUrl = albumData.data.image?.[2]?.url || albumData.data.image?.[1]?.url || albumData.data.image?.[0]?.url;
          
          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          setDominantColor(extractedColor);
          setAlbum(albumData.data);
        }
      } catch (error) {
        console.error('Error fetching album details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId]);

  const handlePlayClick = (song, index) => {
    playSong(song, album.songs || []);
    setCurrentlyPlaying({ song, index });
    console.log(`Playing song:`, song);
  };

  const handlePlayAll = () => {
    if (album?.songs?.length > 0) {
      playSong(album.songs[0], album.songs);
      setCurrentlyPlaying({ song: album.songs[0], index: 0 });
      console.log('Playing all songs starting with:', album.songs[0]);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleArtistClick = (artistId) => {
    router.push(`/music/artist/${artistId}`);
  };

  const extractDominantColor = (imageUrl) => {
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
            if (brightness < 50 || brightness > 200) continue;

            const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          // Find the most common color
          let dominantColor = '34,197,94'; // Default green
          let maxCount = 0;

          for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantColor = color;
            }
          }

          resolve(`rgb(${dominantColor})`);
        } catch (error) {
          console.error('Error extracting color:', error);
          resolve('rgb(34, 197, 94)'); // Default green
        }
      };

      img.onerror = () => {
        resolve('rgb(34, 197, 94)'); // Default green
      };

      img.src = imageUrl;
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    if (!album?.songs) return "0 min";
    const totalSeconds = album.songs.reduce((total, song) => total + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </header>
          <div className="flex-1 p-6">
            <div className="animate-pulse space-y-6">
              <div className="flex gap-6">
                <div className="w-60 h-60 bg-gray-300 rounded-lg" />
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gray-300 rounded w-1/3" />
                  <div className="h-12 bg-gray-300 rounded w-2/3" />
                  <div className="h-4 bg-gray-300 rounded w-1/4" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!album) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Album not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Album</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Album Header */}
          <div
            className="p-6 text-white"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')}, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.9)')})`
            }}
          >
            <div className="flex gap-6 items-end">
              <div className="w-60 h-60 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 shadow-2xl">
                {album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url ? (
                  <img
                    src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                    alt={album.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc className="w-20 h-20 opacity-50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">
                  Album
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                  {album.name}
                </h1>
                <div className="flex items-center gap-2 text-sm mb-2">
                  {album.artists?.primary?.length > 0 && (
                    <>
                      {album.artists.primary.map((artist, index) => (
                        <span key={artist.id || index}>
                          <button
                            className="font-semibold hover:underline transition-colors"
                            onClick={() => handleArtistClick(artist.id)}
                          >
                            {artist.name}
                          </button>
                          {index < album.artists.primary.length - 1 && ', '}
                        </span>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  {album.year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{album.year}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>{album.songCount || album.songs?.length || 0} songs</span>
                  <span>•</span>
                  <span>{getTotalDuration()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className="p-6"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.2)')}, transparent)`
            }}
          >
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                className="rounded-full w-14 h-14 text-black hover:scale-105 transition-transform"
                style={{
                  backgroundColor: dominantColor,
                  boxShadow: `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                }}
                onClick={handlePlayAll}
              >
                <Play className="w-6 h-6 ml-1" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-12 h-12">
                <Shuffle className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-12 h-12">
                <Heart className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-12 h-12">
                <MoreHorizontal className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Songs List */}
          <div className="px-6 pb-24">
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
              <div className="w-8 text-center">#</div>
              <div>Title</div>
              <div className="w-12 text-center">
                <Clock className="w-4 h-4 mx-auto" />
              </div>
            </div>

            <div className="space-y-1">
              {album.songs?.map((song, index) => {
                const isCurrentSong = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id || index}
                    className={`grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 rounded hover:bg-muted/50 group cursor-pointer ${
                      isCurrentSong ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handlePlayClick(song, index)}
                  >
                    <div className="w-8 text-center">
                      {isCurrentSong && isPlaying ? (
                        <div className="flex items-center justify-center">
                          <div className="flex space-x-0.5">
                            <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                            <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                          </div>
                        </div>
                      ) : isCurrentSong ? (
                        <Play className="w-4 h-4 mx-auto text-green-500" />
                      ) : (
                        <>
                          <span className="text-muted-foreground group-hover:hidden">
                            {index + 1}
                          </span>
                          <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                      {song.image?.[0]?.url ? (
                        <img
                          src={song.image[0].url}
                          alt={song.name}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-3 h-3 opacity-50 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{decodeHtmlEntities(song.name) || `Track ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artists?.primary?.length > 0 ? (
                          song.artists.primary.map((artist, artistIndex) => (
                            <span key={artist.id || artistIndex}>
                              <button
                                className="hover:underline hover:text-foreground transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArtistClick(artist.id);
                                }}
                              >
                                {artist.name}
                              </button>
                              {artistIndex < song.artists.primary.length - 1 && ', '}
                            </span>
                          ))
                        ) : (
                          album.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 ${
                        isLiked(song.id) ? 'text-red-500 opacity-100' : ''
                      }`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const result = await toggleLike(song);
                        console.log(result.message);
                      }}
                    >
                      <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <div className="w-12 text-center text-sm text-muted-foreground">
                      {formatDuration(song.duration)}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {(!album.songs || album.songs.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No songs available in this album</p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}