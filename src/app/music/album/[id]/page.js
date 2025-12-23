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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ArrowLeft, Heart, MoreVertical, Clock, Shuffle, Calendar, Disc, Plus, User, Share, Download } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useLikedAlbums } from "@/hooks/useLikedAlbums";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";

export default function AlbumPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const albumId = params.id;

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [dominantColor, setDominantColor] = useState('rgb(34, 197, 94)'); // Default green
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  // Initialize liked songs hook with actual user ID
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize liked albums hook
  const { toggleLike: toggleAlbumLike, isLiked: isAlbumLiked } = useLikedAlbums(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching album ${albumId}`);

        const albumResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums?id=${albumId}`);
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
      const img = new window.Image();
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

  const truncateTitle = (title, maxLength = 50) => {
    if (!title || title.length <= maxLength) return title;

    // Common patterns to remove for better truncation
    const patterns = [
      /\s*\(Original.*?\)/gi,
      /\s*\(From.*?\)/gi,
      /\s*\(Soundtrack.*?\)/gi,
      /\s*\(Music.*?\)/gi,
      /\s*\(Score.*?\)/gi,
      /\s*- Original.*$/gi,
      /\s*- Soundtrack.*$/gi,
    ];

    let shortened = title;
    for (const pattern of patterns) {
      const withoutPattern = shortened.replace(pattern, '');
      if (withoutPattern.length >= 10) { // Keep some minimum length
        shortened = withoutPattern;
        break;
      }
    }

    // If still too long, truncate with ellipsis
    if (shortened.length > maxLength) {
      shortened = shortened.substring(0, maxLength - 3).trim() + '...';
    }

    return shortened;
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToArtist = (e, song) => {
    e.stopPropagation();
    if (song.artists?.primary?.length > 0) {
      router.push(`/music/artist/${song.artists.primary[0].id}`);
    }
  };

  const handleShare = (e, song) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: song.name,
        text: `Check out "${song.name}" by ${song.artists?.primary?.[0]?.name || 'Unknown Artist'}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  };

  const handleDownload = async (e, song) => {
    e.stopPropagation();

    try {
      console.log('Attempting to download song:', song.name);

      // First, try to get download links from the song object
      let downloadUrl = null;

      // Check if song already has download URLs
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        // Look for 320kbps quality first, then fallback to highest available
        const highQuality = song.downloadUrl.find(url => url.quality === '320kbps') ||
          song.downloadUrl.find(url => url.quality === '160kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];
        downloadUrl = highQuality?.url;
      }

      // If no download URL found, fetch from API
      if (!downloadUrl) {
        console.log('No download URL found in song object, fetching from API...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data[0]?.downloadUrl) {
          const songData = data.data[0];
          // Look for 320kbps quality first, then fallback to highest available
          const highQuality = songData.downloadUrl.find(url => url.quality === '320kbps') ||
            songData.downloadUrl.find(url => url.quality === '160kbps') ||
            songData.downloadUrl[songData.downloadUrl.length - 1];
          downloadUrl = highQuality?.url;
          console.log('Found download URL from API:', downloadUrl);
        }
      }

      if (downloadUrl) {
        // Fetch the file through your website and trigger direct download
        console.log('Fetching file for download...');

        const filename = `${decodeHtmlEntities(song.name)} - ${song.artists?.primary?.[0]?.name || 'Unknown Artist'}.mp3`;

        try {
          // Fetch the file as a blob
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg, audio/mp4, */*'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the file as a blob
          const blob = await response.blob();

          // Create a blob URL
          const blobUrl = window.URL.createObjectURL(blob);

          // Create a temporary anchor element for download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.style.display = 'none';

          // Add to DOM, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL after a short delay
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);

          console.log('Download completed for:', song.name);
        } catch (fetchError) {
          console.error('Error fetching file for download:', fetchError);

          // Fallback: try direct link method if blob fetch fails
          console.log('Falling back to direct link method...');
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        console.error('No download URL available for this song');
        alert('Download not available for this song');
      }
    } catch (error) {
      console.error('Error downloading song:', error);
      alert('Failed to download song. Please try again.');
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
                  <BreadcrumbPage>Album</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Album Header */}
          <div
            className="p-4 md:p-6 text-white"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')}, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.9)')})`
            }}
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl">
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
                      <Disc className="w-16 h-16 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Badge variant="secondary" className="mb-2">
                    Album
                  </Badge>
                  <h1 className="text-2xl font-bold break-words leading-tight max-w-full" title={decodeHtmlEntities(album.name)}>
                    {truncateTitle(decodeHtmlEntities(album.name), 35)}
                  </h1>
                  <div className="text-sm mb-2">
                    {album.artists?.primary?.length > 0 && (
                      <>
                        {album.artists.primary.map((artist, index) => (
                          <span key={artist.id || index}>
                            <button
                              className="font-semibold hover:underline transition-colors"
                              onClick={() => handleArtistClick(artist.id)}
                            >
                              {decodeHtmlEntities(artist.name)}
                            </button>
                            {index < album.artists.primary.length - 1 && ', '}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm opacity-80 flex-wrap">
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

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
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
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 break-words leading-tight" title={decodeHtmlEntities(album.name)}>
                  {truncateTitle(decodeHtmlEntities(album.name), 60)}
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
                            {decodeHtmlEntities(artist.name)}
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
                className={`rounded-full w-10 h-10 md:w-12 md:h-12 ${isAlbumLiked(albumId) ? 'text-red-500' : ''}`}
                onClick={() => {
                  // Optimistic update - toggle immediately for better UX
                  toggleAlbumLike(album).catch(error => {
                    console.error('Error toggling album like:', error);
                  });
                }}
              >
                <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isAlbumLiked(albumId) ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>

          {/* Songs List */}
          <div className="px-3 md:px-6 pb-24">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
              <div className="w-8 text-center">#</div>
              <div>Title</div>
              <div className="flex items-center gap-2">
                <div className="w-12 text-center">
                  <Clock className="w-4 h-4 mx-auto" />
                </div>
                <div className="w-8"></div>
              </div>
            </div>

            <div className="space-y-1">
              {album.songs?.map((song, index) => {
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

                      <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 overflow-hidden">
                        {song.image?.length > 0 ? (
                          <img
                            src={song.image.find(img => img.quality === '500x500')?.url ||
                              song.image.find(img => img.quality === '150x150')?.url ||
                              song.image[song.image.length - 1]?.url}
                            alt={song.name}
                            className="w-full h-full object-cover rounded"
                            loading="lazy"
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
                                <span className="md:hidden">
                                  {decodeHtmlEntities(artist.name)}
                                </span>
                                <button
                                  className={`hidden md:inline hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArtistClick(artist.id);
                                  }}
                                >
                                  {decodeHtmlEntities(artist.name)}
                                </button>
                                {artistIndex < song.artists.primary.length - 1 && ', '}
                              </span>
                            ))
                          ) : (
                            album.artists?.primary?.map(artist => decodeHtmlEntities(artist.name)).join(', ') || 'Unknown Artist'
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-xs text-muted-foreground min-w-[35px] text-right">
                          {formatDuration(song.duration)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 h-8 w-8 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 z-[9999]">
                            <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, song)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleGoToArtist(e, song)}>
                              <User className="w-4 h-4 mr-2" />
                              Go to artist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleDownload(e, song)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Optimistic update - toggle immediately for better UX
                                toggleLike(song).catch(error => {
                                  console.error('Error toggling song like:', error);
                                });
                              }}
                              className={isLiked(song.id) ? 'text-red-500' : ''}
                            >
                              <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                              {isLiked(song.id) ? 'Unlike' : 'Like'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div
                      className={`hidden md:grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
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
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 overflow-hidden">
                          {song.image?.length > 0 ? (
                            <img
                              src={song.image.find(img => img.quality === '500x500')?.url ||
                                song.image.find(img => img.quality === '150x150')?.url ||
                                song.image[song.image.length - 1]?.url}
                              alt={song.name}
                              className="w-full h-full object-cover rounded"
                              loading="lazy"
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
                                      handleArtistClick(artist.id);
                                    }}
                                  >
                                    {decodeHtmlEntities(artist.name)}
                                  </button>
                                  {artistIndex < song.artists.primary.length - 1 && ', '}
                                </span>
                              ))
                            ) : (
                              album.artists?.primary?.map(artist => decodeHtmlEntities(artist.name)).join(', ') || 'Unknown Artist'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-12 text-center text-sm text-muted-foreground">
                          {formatDuration(song.duration)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 z-[9999]">
                            <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, song)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleGoToArtist(e, song)}>
                              <User className="w-4 h-4 mr-2" />
                              Go to artist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleDownload(e, song)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Optimistic update - toggle immediately for better UX
                                toggleLike(song).catch(error => {
                                  console.error('Error toggling song like:', error);
                                });
                              }}
                              className={isLiked(song.id) ? 'text-red-500' : ''}
                            >
                              <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                              {isLiked(song.id) ? 'Unlike' : 'Like'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistDialogOpen}
        onOpenChange={setAddToPlaylistDialogOpen}
        song={selectedSong}
      />
    </SidebarProvider>
  );
}