"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { FullscreenMusicPlayer } from "@/components/fullscreen-music-player";

export function MusicPlayer({ currentSong, playlist = [], onSongChange }) {
  const { isPlaying, setIsPlaying } = useMusicPlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef(null);

  // Find current song index in playlist
  const currentIndex =
    playlist.findIndex((song) => song.id === currentSong?.id) || 0;

  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Use only 320kbps quality audio URL
      let audioUrl = null;

      // First try to find 320kbps quality explicitly
      if (currentSong.downloadUrl) {
        audioUrl = currentSong.downloadUrl.find(
          (url) => url.quality === "320kbps" || url.quality === 320
        )?.url;

        // If no explicit 320kbps found, use the highest quality available (index 4)
        if (!audioUrl) {
          audioUrl = currentSong.downloadUrl[4]?.url;
        }
      }

      if (audioUrl) {
        console.log("Playing 320kbps quality:", audioUrl);
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      } else {
        console.warn("320kbps quality not available for this song");
      }
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNext();
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong]);

  // Auto-play when isPlaying becomes true or song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      // Add a small delay to prevent AbortError
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Handle the AbortError gracefully
          if (error.name !== "AbortError") {
            console.error("Audio play error:", error);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  // Media Session API - Rich media notifications
  useEffect(() => {
    if (!currentSong || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    // Get artist name
    const artistName = currentSong.artists?.primary?.[0]?.name || 
                      currentSong.primaryArtists || 
                      "Unknown Artist";

    // Get album name
    const albumName = currentSong.album?.name || "Unknown Album";

    // Get song title
    const songTitle = decodeHtmlEntities(currentSong.name || currentSong.title || "Unknown Song");

    // Prepare artwork - use multiple sizes for better compatibility
    const artwork = [];
    if (currentSong.image && Array.isArray(currentSong.image)) {
      // Use all available image sizes
      currentSong.image.forEach((img, index) => {
        if (img?.url) {
          // Estimate sizes based on JioSaavn API pattern
          const sizes = ['50x50', '150x150', '500x500'];
          const size = sizes[index] || '500x500';
          artwork.push({
            src: img.url,
            sizes: size,
            type: 'image/jpeg'
          });
        }
      });
    }

    // If no artwork, use app icon as fallback
    if (artwork.length === 0) {
      artwork.push({
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      });
    }

    // Set media metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: songTitle,
      artist: artistName,
      album: albumName,
      artwork: artwork
    });

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      if (audioRef.current && !isPlaying) {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current && isPlaying) {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      handlePrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      handleNext();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.currentTime + skipTime, 
          audioRef.current.duration || 0
        );
      }
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    console.log('Media Session updated:', {
      title: songTitle,
      artist: artistName,
      album: albumName,
      artworkCount: artwork.length,
      playbackState: isPlaying ? 'playing' : 'paused'
    });

  }, [currentSong, isPlaying]);

  // Update media session position state
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !audioRef.current) return;

    const updatePositionState = () => {
      if (navigator.mediaSession.setPositionState && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audioRef.current?.playbackRate || 1,
            position: currentTime
          });
        } catch (error) {
          console.log('Position state update failed:', error);
        }
      }
    };

    updatePositionState();
  }, [currentTime, duration]);

  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (playlist.length === 0) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    onSongChange?.(playlist[prevIndex], prevIndex);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    onSongChange?.(playlist[nextIndex], nextIndex);
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Determine the context of where music is playing from
  const getPlayingFromContext = () => {
    if (typeof window === 'undefined') return 'Music';
    
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check current route and determine context
    if (currentPath.includes('/search')) {
      return 'Search Results';
    } else if (currentPath.includes('/album/')) {
      return currentSong?.album?.name || 'Album';
    } else if (currentPath.includes('/artist/')) {
      const artistName = currentSong?.artists?.primary?.[0]?.name || 'Artist';
      return `${artistName}`;
    } else if (currentPath.includes('/playlist/')) {
      return 'Playlist';
    } else if (currentPath.includes('/favorites')) {
      return 'Liked Songs';
    } else if (currentPath.includes('/library/albums')) {
      return 'Your Albums';
    } else if (currentPath.includes('/library/artists')) {
      return 'Your Artists';
    } else if (currentPath.includes('/library/playlists')) {
      return 'Your Playlists';
    } else if (currentPath.includes('/discover')) {
      return 'Discover';
    } else if (currentPath.includes('/new-releases')) {
      return 'New Releases';
    } else {
      return 'Music';
    }
  };

  if (!currentSong) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background border-t border-border z-50">
        <audio ref={audioRef} />

      {/* Mobile Layout */}
      <div className="block md:hidden">
        {/* Top row: Song info and main controls */}
        <div className="flex items-center justify-between p-3 pb-2">
          <div 
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsFullscreen(true)}
          >
            <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
              {currentSong.image?.[0]?.url ? (
                <img
                  src={currentSong.image[0].url}
                  alt={currentSong.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-3 h-3 opacity-50 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">
                {decodeHtmlEntities(currentSong.name)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong.artists?.primary?.[0]?.name || "Unknown Artist"}
              </p>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={playlist.length === 0}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={togglePlayPause}
              className="rounded-full w-10 h-10 p-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={playlist.length === 0}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bottom row: Progress bar */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground min-w-[30px] text-center">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[30px] text-center">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-3">
        <div className="flex items-center gap-4 w-full">
          {/* Song Info */}
          <div 
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setIsFullscreen(true)}
          >
            <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
              {currentSong.image?.[0]?.url ? (
                <img
                  src={currentSong.image[0].url}
                  alt={currentSong.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-4 h-4 opacity-50 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">
                {decodeHtmlEntities(currentSong.name)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong.artists?.primary?.[0]?.name || "Unknown Artist"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={playlist.length === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={togglePlayPause}
                className="rounded-full w-8 h-8"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={playlist.length === 0}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-muted-foreground min-w-[35px]">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground min-w-[35px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Volume2 className="w-4 h-4" />
            <Slider
              value={[volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Fullscreen Music Player */}
    <FullscreenMusicPlayer
      currentSong={currentSong}
      playlist={playlist}
      onSongChange={onSongChange}
      isOpen={isFullscreen}
      onClose={() => setIsFullscreen(false)}
      audioRef={audioRef}
      currentTime={currentTime}
      duration={duration}
      volume={volume}
      onVolumeChange={handleVolumeChange}
      onSeek={handleSeek}
      onTogglePlayPause={togglePlayPause}
      onPrevious={handlePrevious}
      onNext={handleNext}
      isPlaying={isPlaying}
      playingFrom={getPlayingFromContext()}
    />
    </>
  );
}
