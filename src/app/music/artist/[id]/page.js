"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Heart, MoreHorizontal, Shuffle, Users, Calendar } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";

export default function ArtistPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = params.id;
  const { data: session } = useSession();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [dominantColor, setDominantColor] = useState('rgb(34, 197, 94)'); // Default green
  const [isArtistLiked, setIsArtistLiked] = useState(false);
  const [artistLikeLoading, setArtistLikeLoading] = useState(false);

  // Initialize liked songs hook with actual user ID
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const fetchArtistDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching artist ${artistId}`);

        const artistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists?id=${artistId}`);
        const artistData = await artistResponse.json();

        if (artistData.success && artistData.data) {
          console.log(`Fetched artist "${artistData.data.name}"`);

          // Extract dominant color from artist image
          let extractedColor = 'rgb(34, 197, 94)'; // Default green
          const imageUrl = artistData.data.image?.[2]?.url || artistData.data.image?.[1]?.url || artistData.data.image?.[0]?.url;

          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          setDominantColor(extractedColor);
          setArtist(artistData.data);
        }
      } catch (error) {
        console.error('Error fetching artist details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchArtistDetails();
    }
  }, [artistId]);

  // Check if artist is liked when component mounts and session is available
  useEffect(() => {
    const checkArtistLiked = async () => {
      if (session?.user?.id && artistId) {
        try {
          const response = await fetch(`/api/liked-artists/check?userId=${session.user.id}&artistId=${artistId}`);
          const data = await response.json();
          if (data.success) {
            setIsArtistLiked(data.isLiked);
          }
        } catch (error) {
          console.error('Error checking if artist is liked:', error);
        }
      }
    };

    checkArtistLiked();
  }, [session, artistId]);

  const handlePlayClick = (song, index) => {
    playSong(song, artist.topSongs || []);
    setCurrentlyPlaying({ song, index });
    console.log(`Playing song:`, song);
  };

  const handlePlayAll = () => {
    if (artist?.topSongs?.length > 0) {
      playSong(artist.topSongs[0], artist.topSongs);
      setCurrentlyPlaying({ song: artist.topSongs[0], index: 0 });
      console.log('Playing all songs starting with:', artist.topSongs[0]);
    }
  };

  const handleGoBack = () => {
    router.back();
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

  const formatFollowers = (count) => {
    if (!count) return "0";
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const toggleArtistLike = async () => {
    if (!session?.user?.id) {
      console.log('User not logged in');
      return;
    }

    try {
      setArtistLikeLoading(true);
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          artistId: artistId
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsArtistLiked(data.liked);
        console.log(data.message);
      }
    } catch (error) {
      console.error('Error toggling artist like:', error);
    } finally {
      setArtistLikeLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-full" />
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div className="h-6 bg-muted rounded w-24 mx-auto md:mx-0" />
                  <div className="h-8 md:h-12 bg-muted rounded w-48 mx-auto md:mx-0" />
                  <div className="h-4 bg-muted rounded w-32 mx-auto md:mx-0" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!artist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Artist not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-3 md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Artist</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Artist Header */}
          <div
            className="p-4 md:p-6 text-white"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')}, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.9)')})`
            }}
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                  {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                    <img
                      src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-16 h-16 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {artist.isVerified && (
                    <Badge variant="secondary" className="mb-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                      Verified Artist
                    </Badge>
                  )}
                  <h1 className="text-2xl font-bold break-words">
                    {artist.name}
                  </h1>
                  <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{formatFollowers(artist.followerCount)} followers</span>
                    </div>
                    {artist.dob && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Born {artist.dob}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
              <div className="w-60 h-60 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
                {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                  <img
                    src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-20 h-20 opacity-50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {artist.isVerified && (
                  <Badge variant="secondary" className="mb-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                    Verified Artist
                  </Badge>
                )}
                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                  {artist.name}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{formatFollowers(artist.followerCount)} followers</span>
                  </div>
                  {artist.dob && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Born {artist.dob}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className="p-4 md:p-6"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.2)')}, transparent)`
            }}
          >
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-transform"
                style={{
                  backgroundColor: dominantColor,
                  boxShadow: `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                }}
                onClick={handlePlayAll}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5 md:ml-1" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className={`rounded-full w-10 h-10 md:w-12 md:h-12 ${isArtistLiked ? 'text-red-500' : ''}`}
                onClick={toggleArtistLike}
                disabled={artistLikeLoading || !session?.user?.id}
              >
                <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isArtistLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <MoreHorizontal className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>

          <div className="px-3 md:px-6 pb-24 space-y-6 md:space-y-8">
            {/* Popular Songs */}
            {artist.topSongs && artist.topSongs.length > 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Popular</h2>
                <div className="space-y-1">
                  {artist.topSongs.slice(0, 10).map((song, index) => {
                    const isCurrentSong = currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id || index}
                        className={`flex items-center gap-3 md:gap-4 p-2 md:p-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                          }`}
                        onClick={() => handlePlayClick(song, index)}
                      >
                        <div className="w-6 md:w-8 text-center flex-shrink-0">
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
                              <span className="text-muted-foreground group-hover:hidden text-sm">
                                {index + 1}
                              </span>
                              <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                            </>
                          )}
                        </div>

                        <div className="w-10 h-10 md:w-10 md:h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
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

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate text-sm md:text-base ${isCurrentSong ? 'text-green-500' : ''
                            }`}>
                            {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                          </p>
                          <p className={`text-xs md:text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                            }`}>
                            {song.album?.name || 'Unknown Album'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`p-1 h-8 w-8 ${isLiked(song.id) ? 'text-red-500' : 'text-muted-foreground'} md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? 'md:opacity-100' : ''
                              }`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await toggleLike(song);
                              console.log(result.message);
                            }}
                          >
                            <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                          </Button>
                          <div className="text-xs md:text-sm text-muted-foreground min-w-[35px] md:min-w-[40px] text-right">
                            {formatDuration(song.duration)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Albums */}
            {artist.topAlbums && artist.topAlbums.length > 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                  {artist.topAlbums.slice(0, 12).map((album) => (
                    <div
                      key={album.id}
                      className="group cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => router.push(`/music/album/${album.id}`)}
                    >
                      <div className="relative rounded-lg aspect-square overflow-hidden mb-2 md:mb-3 bg-gradient-to-br from-purple-500 to-pink-500">
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
                          <div className="w-full h-full flex items-center justify-center text-white">
                            <Play className="w-8 h-8 md:w-12 md:h-12 opacity-50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Button
                          size="icon"
                          className="absolute bottom-1 right-1 md:bottom-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 rounded-full shadow-lg w-8 h-8 md:w-10 md:h-10"
                        >
                          <Play className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs md:text-sm font-medium leading-tight line-clamp-2 text-foreground">
                          {album.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {album.year} • Album
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            {artist.bio && artist.bio.length > 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">About</h2>
                <div className="space-y-3 md:space-y-4">
                  {artist.bio.slice(0, 3).map((bioSection, index) => (
                    <div key={index}>
                      {bioSection.title && (
                        <h3 className="text-base md:text-lg font-semibold mb-2">{bioSection.title}</h3>
                      )}
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {bioSection.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}