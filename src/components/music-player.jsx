"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";

export function MusicPlayer({ currentSong, playlist = [], onSongChange }) {
  const { isPlaying, setIsPlaying } = useMusicPlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
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

  // Auto-play when isPlaying becomes true
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

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background border-t border-border z-50">
      <audio ref={audioRef} />

      {/* Mobile Layout */}
      <div className="block md:hidden">
        {/* Top row: Song info and main controls */}
        <div className="flex items-center justify-between p-3 pb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
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
          <div className="flex items-center gap-3 min-w-0 flex-1">
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
  );
}
