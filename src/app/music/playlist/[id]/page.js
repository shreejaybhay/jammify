"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { Play, ArrowLeft, Heart, MoreHorizontal, Clock, Shuffle } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";
import { useMusicPlayer } from "@/contexts/music-player-context";

export default function PlaylistPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const playlistId = params.id;
  const songCount = searchParams.get('songCount') || 50;

  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [dominantColor, setDominantColor] = useState('rgb(34, 197, 94)'); // Default green

  // Initialize liked songs hook with actual user name
  const { toggleLike, isLiked } = useLikedSongs('shree jaybhay');

  // Initialize liked playlists hook
  const {
    toggleLike: togglePlaylistLike,
    isLiked: isPlaylistLiked
  } = useLikedPlaylists('shree jaybhay');

  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      try {
        setLoading(true);

        // Get playlist data with all songs using the exact songCount from search results
        console.log(`Fetching playlist ${playlistId} with limit=${songCount}`);
        const playlistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/playlists?id=${playlistId}&page=0&limit=${songCount}`);
        const playlistData = await playlistResponse.json();

        if (playlistData.success && playlistData.data) {
          console.log(`Fetched playlist "${playlistData.data.name}" with ${playlistData.data.songs?.length || 0} songs`);

          let finalPlaylistData = playlistData.data;

          // Check if playlist has valid image URLs (not just query parameters)
          let imageUrl = finalPlaylistData.image?.[2]?.url || finalPlaylistData.image?.[1]?.url || finalPlaylistData.image?.[0]?.url;

          // Check if the image URL is invalid (just query parameters or empty)
          if (!imageUrl || imageUrl.startsWith('?') || imageUrl.length < 10) {
            console.log('Invalid or missing image in playlist API, trying search API...');
            try {
              const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=new%20releases&page=0&limit=100`);
              const searchData = await searchResponse.json();

              if (searchData.success && searchData.data.results) {
                const foundPlaylist = searchData.data.results.find(p => p.id === playlistId);
                if (foundPlaylist && foundPlaylist.image) {
                  console.log('Found image in search API:', foundPlaylist.image);
                  finalPlaylistData.image = foundPlaylist.image;
                  imageUrl = foundPlaylist.image[2]?.url || foundPlaylist.image[1]?.url || foundPlaylist.image[0]?.url;
                }
              }
            } catch (error) {
              console.error('Error fetching from search API:', error);
            }
          }

          // Extract dominant color from playlist image BEFORE setting playlist data
          let extractedColor = 'rgb(34, 197, 94)'; // Default green
          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          // Set all data together after color extraction is complete
          setDominantColor(extractedColor);
          setPlaylist(finalPlaylistData);
          setSongs(finalPlaylistData.songs || []);
        }
      } catch (error) {
        console.error('Error fetching playlist details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (playlistId) {
      fetchPlaylistDetails();
    }
  }, [playlistId, songCount]);

  const handlePlayClick = (song, index) => {
    playSong(song, songs);
    setCurrentlyPlaying({ song, index });
    console.log(`Playing song:`, song);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
      setCurrentlyPlaying({ song: songs[0], index: 0 });
      console.log('Playing all songs starting with:', songs[0]);
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
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-lg" />
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

  if (!playlist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Playlist not found</p>
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
                  <BreadcrumbPage>Playlist</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Playlist Header */}
          <div
            className="p-4 md:p-6 text-white"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')}, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.9)')})`
            }}
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                  {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                    <img
                      src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-16 h-16 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary" className="mb-2">
                    Public Playlist
                  </Badge>
                  <h1 className="text-2xl font-bold break-words">
                    {playlist.name}
                  </h1>
                  <p className="text-sm opacity-80">
                    {playlist.subtitle || playlist.header_desc || "Curated playlist"}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-sm flex-wrap">
                    <span className="font-semibold">JioSaavn</span>
                    <span>•</span>
                    <span>{playlist.songCount || songs.length} songs</span>
                    {playlist.follower_count && (
                      <>
                        <span>•</span>
                        <span>{playlist.follower_count} saves</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
              <div className="w-60 h-60 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                  <img
                    src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-20 h-20 opacity-50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">
                  Public Playlist
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                  {playlist.name}
                </h1>
                <p className="text-sm opacity-80 mb-2">
                  {playlist.subtitle || playlist.header_desc || "Curated playlist"}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold">JioSaavn</span>
                  <span>•</span>
                  <span>{playlist.songCount || songs.length} songs</span>
                  {playlist.follower_count && (
                    <>
                      <span>•</span>
                      <span>{playlist.follower_count} saves</span>
                    </>
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
                className={`rounded-full w-10 h-10 md:w-12 md:h-12 ${isPlaylistLiked(playlistId) ? 'text-red-500' : ''
                  }`}
                onClick={async () => {
                  const result = await togglePlaylistLike({
                    id: playlistId,
                    name: playlist.name,
                    description: playlist.subtitle || playlist.header_desc || '',
                    image: playlist.image,
                    songCount: playlist.songCount || songs.length
                  });
                  console.log(result.message);
                }}
              >
                <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isPlaylistLiked(playlistId) ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <MoreHorizontal className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>

          {/* Songs List */}
          <div className="px-3 md:px-6 pb-24">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
              <div className="w-8 text-center">#</div>
              <div>Title</div>
              <div>Album</div>
              <div>Release Date</div>
              <div className="text-center">
                <Clock className="w-4 h-4 mx-auto" />
              </div>
            </div>

            <div className="space-y-1">
              {songs.map((song, index) => {
                const isCurrentSong = currentSong?.id === song.id;
                return (
                  <div key={song.id || index}>
                    {/* Mobile Layout */}
                    <div
                      className={`md:hidden flex items-center gap-3 p-3 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                        }`}
                      onClick={() => handlePlayClick(song, index)}
                    >
                      <div className="w-6 text-center flex-shrink-0">
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

                      <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
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
                            <Play className="w-4 h-4 opacity-50 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                          }`}>
                          {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                        </p>
                        <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                          }`}>
                          {song.artists?.primary?.length > 0 ? (
                            song.artists.primary.map((artist, artistIndex) => (
                              <span key={artist.id || artistIndex}>
                                <button
                                  className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/music/artist/${artist.id}`);
                                  }}
                                >
                                  {artist.name}
                                </button>
                                {artistIndex < song.artists.primary.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            'Unknown Artist'
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`p-2 h-8 w-8 ${isLiked(song.id) ? 'text-red-500' : 'text-muted-foreground'
                            }`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await toggleLike(song);
                            console.log(result.message);
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <div className="text-xs text-muted-foreground min-w-[35px] text-right">
                          {formatDuration(song.duration)}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div
                      className={`hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center p-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
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
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
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
                          <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                            }`}>
                            {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                          </p>
                          <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                            }`}>
                            {song.artists?.primary?.length > 0 ? (
                              song.artists.primary.map((artist, artistIndex) => (
                                <span key={artist.id || artistIndex}>
                                  <button
                                    className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                      }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/music/artist/${artist.id}`);
                                    }}
                                  >
                                    {artist.name}
                                  </button>
                                  {artistIndex < song.artists.primary.length - 1 && ', '}
                                </span>
                              ))
                            ) : (
                              'Unknown Artist'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground truncate">
                        {song.album?.name ? (
                          <button
                            className="hover:underline hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Use the album ID directly from the album object
                              if (song.album.id) {
                                router.push(`/music/album/${song.album.id}`);
                              }
                            }}
                          >
                            {decodeHtmlEntities(song.album.name)}
                          </button>
                        ) : (
                          'Unknown Album'
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {song.releaseDate ? new Date(song.releaseDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Unknown date'}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 shrink-0 ${isLiked(song.id) ? 'text-red-500 opacity-100' : ''
                            }`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await toggleLike(song);
                            console.log(result.message);
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <div className="text-sm text-muted-foreground min-w-[40px] text-right">
                          {formatDuration(song.duration)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {songs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No songs available in this playlist</p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}