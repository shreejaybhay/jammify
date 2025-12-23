"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ArrowLeft, Heart, MoreVertical, Clock, Shuffle, Download, Plus, User, Disc, Share } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";

export default function FavoritesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  // Initialize liked songs hook
  const { likedSongs, loading, toggleLike, getLikedCount } = useLikedSongs(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  const handlePlayClick = (song, index) => {
    const isCurrentSong = currentSong?.id === song.songId;

    // If clicking on the currently playing song, do nothing
    if (isCurrentSong) {
      return;
    }

    // Convert liked song format to standard song format for the player
    const songData = {
      id: song.songId,
      name: song.songName,
      artists: { primary: song.artists },
      album: song.album,
      duration: song.duration,
      image: song.image,
      releaseDate: song.releaseDate,
      language: song.language,
      playCount: song.playCount,
      downloadUrl: song.downloadUrl
    };

    // Convert all liked songs to standard format for playlist
    const playlistData = likedSongs.map(likedSong => ({
      id: likedSong.songId,
      name: likedSong.songName,
      artists: { primary: likedSong.artists },
      album: likedSong.album,
      duration: likedSong.duration,
      image: likedSong.image,
      releaseDate: likedSong.releaseDate,
      language: likedSong.language,
      playCount: likedSong.playCount,
      downloadUrl: likedSong.downloadUrl
    }));

    playSong(songData, playlistData);
    setCurrentlyPlaying({ song, index });
    console.log(`Playing song:`, song);
  };

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      // Convert first song to standard format
      const firstSong = {
        id: likedSongs[0].songId,
        name: likedSongs[0].songName,
        artists: { primary: likedSongs[0].artists },
        album: likedSongs[0].album,
        duration: likedSongs[0].duration,
        image: likedSongs[0].image,
        releaseDate: likedSongs[0].releaseDate,
        language: likedSongs[0].language,
        playCount: likedSongs[0].playCount,
        downloadUrl: likedSongs[0].downloadUrl
      };

      // Convert all liked songs to standard format for playlist
      const playlistData = likedSongs.map(likedSong => ({
        id: likedSong.songId,
        name: likedSong.songName,
        artists: { primary: likedSong.artists },
        album: likedSong.album,
        duration: likedSong.duration,
        image: likedSong.image,
        releaseDate: likedSong.releaseDate,
        language: likedSong.language,
        playCount: likedSong.playCount,
        downloadUrl: likedSong.downloadUrl
      }));

      playSong(firstSong, playlistData);
      setCurrentlyPlaying({ song: likedSongs[0], index: 0 });
      console.log('Playing all liked songs starting with:', likedSongs[0]);
    }
  };

  const handleGoBack = () => {
    router.back();
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToArtist = (e, song) => {
    e.stopPropagation();
    if (song.artists?.length > 0) {
      router.push(`/music/artist/${song.artists[0].id}`);
    }
  };

  const handleGoToAlbum = (e, song) => {
    e.stopPropagation();
    if (song.album?.id) {
      router.push(`/music/album/${song.album.id}`);
    }
  };

  const handleShare = (e, song) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: song.songName,
        text: `Check out "${song.songName}" by ${song.artists?.[0]?.name || 'Unknown Artist'}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  };

  const handleDownloadAllLikedSongs = async () => {
    if (likedSongs.length === 0) {
      // Show toast if no songs to download
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'No liked songs to download!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }

    // Show initial toast
    const progressToast = document.createElement('div');
    progressToast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    progressToast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Downloading liked songs... (0/${likedSongs.length})</span>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;

    // Download songs with a small delay between each to avoid overwhelming the server
    for (let i = 0; i < likedSongs.length; i++) {
      const song = likedSongs[i];

      try {
        // Update progress
        progressToast.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Downloading "${decodeHtmlEntities(song.songName)}"... (${i + 1}/${likedSongs.length})</span>
          </div>
        `;

        await downloadSingleLikedSong(song);
        downloadedCount++;
      } catch (error) {
        console.error(`Failed to download ${song.songName}:`, error);
        failedCount++;
      }

      // Small delay between downloads
      if (i < likedSongs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Remove progress toast
    progressToast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(progressToast);
    }, 300);

    // Show completion toast
    const completionToast = document.createElement('div');
    if (failedCount === 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Successfully downloaded all ${downloadedCount} liked songs!`;
    } else if (downloadedCount > 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Downloaded ${downloadedCount} songs, ${failedCount} failed from liked songs`;
    } else {
      completionToast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Failed to download liked songs. Please try again.`;
    }

    document.body.appendChild(completionToast);
    setTimeout(() => {
      completionToast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(completionToast);
      }, 300);
    }, 5000);
  };

  const downloadSingleLikedSong = async (song) => {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.songId}`);
      const data = await response.json();

      if (data.success && data.data && data.data[0]?.downloadUrl) {
        const songData = data.data[0];
        // Look for 320kbps quality first, then fallback to highest available
        const highQuality = songData.downloadUrl.find(url => url.quality === '320kbps') ||
          songData.downloadUrl.find(url => url.quality === '160kbps') ||
          songData.downloadUrl[songData.downloadUrl.length - 1];
        downloadUrl = highQuality?.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('No download URL available');
    }

    const filename = `${decodeHtmlEntities(song.songName)} - ${song.artists?.[0]?.name || 'Unknown Artist'}.mp3`;

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

    } catch (fetchError) {
      // Fallback: try direct link method if blob fetch fails
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownload = async (e, song) => {
    e.stopPropagation();

    try {
      console.log('Attempting to download song:', song.songName);

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/songs?ids=${song.songId}`);
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

        const filename = `${decodeHtmlEntities(song.songName)} - ${song.artists?.[0]?.name || 'Unknown Artist'}.mp3`;

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

          console.log('Download completed for:', song.songName);
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
                  <BreadcrumbPage>Favorites</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Favorites Header */}
          <div className="p-4 md:p-6 text-white bg-gradient-to-br from-purple-600 to-purple-800">
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl flex items-center justify-center">
                  <Heart className="w-16 h-16 fill-current text-white" />
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary" className="mb-2">
                    Playlist
                  </Badge>
                  <h1 className="text-2xl font-bold break-words">
                    Liked Songs
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-sm opacity-80">
                    <span className="font-semibold">{session?.user?.name || 'You'}</span>
                    <span>•</span>
                    <span>{getLikedCount()} songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
              <div className="w-60 h-60 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 shadow-2xl flex items-center justify-center">
                <Heart className="w-20 h-20 fill-current text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">
                  Playlist
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                  Liked Songs
                </h1>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <span className="font-semibold">{session?.user?.name || 'You'}</span>
                  <span>•</span>
                  <span>{getLikedCount()} songs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 md:p-6 bg-gradient-to-b from-purple-600/20 to-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-transform bg-green-500 hover:bg-green-600"
                onClick={handlePlayAll}
                disabled={likedSongs.length === 0}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5 md:ml-1" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full w-10 h-10 md:w-12 md:h-12"
                onClick={handleDownloadAllLikedSongs}
                disabled={likedSongs.length === 0}
              >
                <Download className="w-5 h-5 md:w-6 md:h-6" />
              </Button>

            </div>
          </div>

          {/* Songs List */}
          <div className="px-3 md:px-6 pb-24">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center p-2">
                    <div className="w-8 h-4 bg-muted animate-pulse rounded" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted animate-pulse rounded" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                    <div className="h-4 bg-muted animate-pulse rounded w-20" />
                    <div className="h-4 bg-muted animate-pulse rounded w-10" />
                  </div>
                ))}
              </div>
            ) : likedSongs.length > 0 ? (
              <>
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                  <div className="w-8 text-center">#</div>
                  <div>Title</div>
                  <div>Album</div>
                  <div>Date added</div>
                  <div className="flex items-center justify-end gap-1">
                    <div className="min-w-[40px] text-right">
                      <Clock className="w-4 h-4 ml-auto" />
                    </div>
                    <div className="w-8"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  {likedSongs.map((likedSong, index) => {
                    const isCurrentSong = currentSong?.id === likedSong.songId;
                    return (
                      <div key={likedSong.songId || index}>
                        {/* Mobile Layout */}
                        <div
                          className={`md:hidden flex items-center gap-3 p-3 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                            }`}
                          onClick={() => handlePlayClick(likedSong, index)}
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
                            {likedSong.image?.length > 0 ? (
                              <img
                                src={likedSong.image.find(img => img.quality === '500x500')?.url ||
                                  likedSong.image.find(img => img.quality === '150x150')?.url ||
                                  likedSong.image[likedSong.image.length - 1]?.url}
                                alt={likedSong.songName}
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
                              {decodeHtmlEntities(likedSong.songName) || `Track ${index + 1}`}
                            </p>
                            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                              }`}>
                              {likedSong.artists?.length > 0 ? (
                                likedSong.artists.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    <span className="md:hidden">
                                      {artist.name}
                                    </span>
                                    <button
                                      className={`hidden md:inline hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/music/artist/${artist.id}`);
                                      }}
                                    >
                                      {artist.name}
                                    </button>
                                    {artistIndex < likedSong.artists.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                'Unknown Artist'
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-xs text-muted-foreground min-w-[35px] text-right">
                              {formatDuration(likedSong.duration)}
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
                                <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, likedSong)}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add to playlist
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleGoToArtist(e, likedSong)}>
                                  <User className="w-4 h-4 mr-2" />
                                  Go to artist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, likedSong)}>
                                  <Disc className="w-4 h-4 mr-2" />
                                  Go to album
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleDownload(e, likedSong)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const songData = {
                                      id: likedSong.songId,
                                      name: likedSong.songName,
                                      artists: { primary: likedSong.artists },
                                      album: likedSong.album,
                                      duration: likedSong.duration,
                                      image: likedSong.image,
                                      releaseDate: likedSong.releaseDate,
                                      language: likedSong.language,
                                      playCount: likedSong.playCount,
                                      downloadUrl: likedSong.downloadUrl
                                    };
                                    const result = await toggleLike(songData);
                                    console.log(result.message);
                                  }}
                                  className="text-red-500"
                                >
                                  <Heart className="w-4 h-4 mr-2 fill-current" />
                                  Unlike
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div
                          className={`hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center p-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                            }`}
                          onClick={() => handlePlayClick(likedSong, index)}
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
                              {likedSong.image?.length > 0 ? (
                                <img
                                  src={likedSong.image.find(img => img.quality === '500x500')?.url ||
                                    likedSong.image.find(img => img.quality === '150x150')?.url ||
                                    likedSong.image[likedSong.image.length - 1]?.url}
                                  alt={likedSong.songName}
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
                                {decodeHtmlEntities(likedSong.songName) || `Track ${index + 1}`}
                              </p>
                              <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                }`}>
                                {likedSong.artists?.length > 0 ? (
                                  likedSong.artists.map((artist, artistIndex) => (
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
                                      {artistIndex < likedSong.artists.length - 1 && ', '}
                                    </span>
                                  ))
                                ) : (
                                  'Unknown Artist'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground truncate">
                            {likedSong.album?.name ? (
                              <button
                                className="hover:underline hover:text-foreground transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (likedSong.album.id) {
                                    router.push(`/music/album/${likedSong.album.id}`);
                                  }
                                }}
                              >
                                {decodeHtmlEntities(likedSong.album.name)}
                              </button>
                            ) : (
                              'Unknown Album'
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {formatDate(likedSong.likedAt)}
                          </div>

                          <div className="flex items-center justify-end gap-1">
                            <div className="text-sm text-muted-foreground min-w-[40px] text-right">
                              {formatDuration(likedSong.duration)}
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
                                <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, likedSong)}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add to playlist
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleGoToArtist(e, likedSong)}>
                                  <User className="w-4 h-4 mr-2" />
                                  Go to artist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, likedSong)}>
                                  <Disc className="w-4 h-4 mr-2" />
                                  Go to album
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleDownload(e, likedSong)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const songData = {
                                      id: likedSong.songId,
                                      name: likedSong.songName,
                                      artists: { primary: likedSong.artists },
                                      album: likedSong.album,
                                      duration: likedSong.duration,
                                      image: likedSong.image,
                                      releaseDate: likedSong.releaseDate,
                                      language: likedSong.language,
                                      playCount: likedSong.playCount,
                                      downloadUrl: likedSong.downloadUrl
                                    };
                                    const result = await toggleLike(songData);
                                    console.log(result.message);
                                  }}
                                  className="text-red-500"
                                >
                                  <Heart className="w-4 h-4 mr-2 fill-current" />
                                  Unlike
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
                <p className="text-muted-foreground mb-4">Songs you like will appear here</p>
                <Button onClick={() => router.push('/music')}>
                  Find music you love
                </Button>
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