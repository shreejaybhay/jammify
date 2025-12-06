"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  Heart,
  MoreHorizontal,
  Shuffle,
  Repeat,
  Share,
  ListMusic,
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useSession } from "next-auth/react";

export function FullscreenMusicPlayer({
  currentSong,
  playlist = [],
  onSongChange,
  isOpen,
  onClose,
  audioRef,
  currentTime,
  duration,
  volume,
  onVolumeChange,
  onSeek,
  onTogglePlayPause,
  onPrevious,
  onNext,
  isPlaying,
  playingFrom = "Search Results", // Add playingFrom prop with default
}) {
  const { data: session } = useSession();
  const { setIsPlaying } = useMusicPlayer();
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // 'off', 'all', 'one'
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [dominantColors, setDominantColors] = useState({
    primary: "#6366f1", // Default indigo
    secondary: "#8b5cf6", // Default purple
    accent: "#a855f7", // Default purple
  });

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

  const getArtistNames = (song) => {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((artist) => artist.name).join(", ");
    }
    if (song.primaryArtists) return song.primaryArtists;
    return "Unknown Artist";
  };

  const handleLikeToggle = async () => {
    if (!currentSong) return;

    try {
      const songData = {
        id: currentSong.id,
        name: currentSong.name || currentSong.title,
        title: currentSong.name || currentSong.title,
        artists: currentSong.artists || { primary: [] },
        primaryArtists:
          currentSong.primaryArtists || getArtistNames(currentSong),
        album: currentSong.album || { id: "", name: "" },
        duration: currentSong.duration || 0,
        image: currentSong.image || [],
        releaseDate: currentSong.releaseDate || "",
        language: currentSong.language || "",
        playCount: currentSong.playCount || 0,
        downloadUrl: currentSong.downloadUrl || [],
        url: currentSong.url || "",
        type: "song",
      };
      await toggleLike(songData);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const toggleRepeat = () => {
    const modes = ["off", "all", "one"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  // Extract dominant colors from album art
  const extractColorsFromImage = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Set canvas size
          canvas.width = 100;
          canvas.height = 100;

          // Draw image
          ctx.drawImage(img, 0, 0, 100, 100);

          // Get image data
          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;

          // Extract colors
          const colorCounts = {};
          const step = 4; // Skip some pixels for performance

          for (let i = 0; i < data.length; i += step * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            // Skip transparent pixels
            if (alpha < 128) continue;

            // Group similar colors
            const key = `${Math.floor(r / 32) * 32},${
              Math.floor(g / 32) * 32
            },${Math.floor(b / 32) * 32}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
          }

          // Sort colors by frequency
          const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([color]) => {
              const [r, g, b] = color.split(",").map(Number);
              return { r, g, b };
            });

          if (sortedColors.length > 0) {
            // Create color variations
            const primary = sortedColors[0];
            const secondary = sortedColors[1] || primary;
            const accent = sortedColors[2] || secondary;

            // Convert to hex and create variations
            const toHex = (color) => {
              const hex = (n) => n.toString(16).padStart(2, "0");
              return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
            };

            // Create darker variations for better contrast
            const darken = (color, amount = 0.3) => ({
              r: Math.max(0, Math.floor(color.r * (1 - amount))),
              g: Math.max(0, Math.floor(color.g * (1 - amount))),
              b: Math.max(0, Math.floor(color.b * (1 - amount))),
            });

            resolve({
              primary: toHex(darken(primary, 0.2)),
              secondary: toHex(darken(secondary, 0.4)),
              accent: toHex(darken(accent, 0.6)),
            });
          } else {
            // Fallback colors
            resolve({
              primary: "#1e293b",
              secondary: "#334155",
              accent: "#475569",
            });
          }
        } catch (error) {
          console.error("Error extracting colors:", error);
          resolve({
            primary: "#1e293b",
            secondary: "#334155",
            accent: "#475569",
          });
        }
      };

      img.onerror = () => {
        resolve({
          primary: "#1e293b",
          secondary: "#334155",
          accent: "#475569",
        });
      };

      img.src = imageUrl;
    });
  };

  // Shuffle array function
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Create shuffled playlist when shuffle is enabled
  useEffect(() => {
    if (isShuffled && playlist.length > 0) {
      // Create shuffled playlist but keep current song at the beginning
      const otherSongs = playlist.filter((song) => song.id !== currentSong?.id);
      const shuffledOthers = shuffleArray(otherSongs);

      // If current song exists, put it first, otherwise just shuffle all
      const shuffled = currentSong
        ? [currentSong, ...shuffledOthers]
        : shuffleArray(playlist);

      setShuffledPlaylist(shuffled);
    } else {
      setShuffledPlaylist([]);
    }
  }, [isShuffled, playlist, currentSong?.id]);

  // Get current playlist (shuffled or normal)
  const getCurrentPlaylist = () => {
    return isShuffled ? shuffledPlaylist : playlist;
  };

  // Enhanced next/previous functions with shuffle and repeat support
  const handleNext = () => {
    const currentPlaylist = getCurrentPlaylist();
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let nextIndex;

    if (repeatMode === "one") {
      // Repeat current song
      nextIndex = currentIndex;
    } else if (currentIndex < currentPlaylist.length - 1) {
      // Next song in playlist
      nextIndex = currentIndex + 1;
    } else if (repeatMode === "all") {
      // Loop back to first song
      nextIndex = 0;
    } else {
      // End of playlist, stop playing
      setIsPlaying(false);
      return;
    }

    const nextSong = currentPlaylist[nextIndex];
    if (nextSong) {
      onSongChange?.(nextSong, nextIndex);
      setIsPlaying(true); // Ensure auto-play
    }
  };

  const handlePrevious = () => {
    const currentPlaylist = getCurrentPlaylist();
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let prevIndex;

    if (repeatMode === "one") {
      // Repeat current song
      prevIndex = currentIndex;
    } else if (currentIndex > 0) {
      // Previous song in playlist
      prevIndex = currentIndex - 1;
    } else if (repeatMode === "all") {
      // Loop to last song
      prevIndex = currentPlaylist.length - 1;
    } else {
      // Beginning of playlist, go to first song
      prevIndex = 0;
    }

    const prevSong = currentPlaylist[prevIndex];
    if (prevSong) {
      onSongChange?.(prevSong, prevIndex);
      setIsPlaying(true); // Ensure auto-play
    }
  };

  // Handle song end - auto play next song
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleSongEnd = () => {
      console.log("Song ended, playing next...");
      const currentPlaylist = isShuffled ? shuffledPlaylist : playlist;
      if (currentPlaylist.length === 0) return;

      const currentIndex = currentPlaylist.findIndex(
        (song) => song.id === currentSong?.id
      );
      let nextIndex;

      if (repeatMode === "one") {
        // Repeat current song
        nextIndex = currentIndex;
      } else if (currentIndex < currentPlaylist.length - 1) {
        // Next song in playlist
        nextIndex = currentIndex + 1;
      } else if (repeatMode === "all") {
        // Loop back to first song
        nextIndex = 0;
      } else {
        // End of playlist, stop playing
        setIsPlaying(false);
        return;
      }

      const nextSong = currentPlaylist[nextIndex];
      if (nextSong) {
        onSongChange?.(nextSong, nextIndex);
        setIsPlaying(true); // Ensure auto-play
      }
    };

    audio.addEventListener("ended", handleSongEnd);
    return () => {
      audio.removeEventListener("ended", handleSongEnd);
    };
  }, [
    currentSong?.id,
    repeatMode,
    isShuffled,
    shuffledPlaylist,
    playlist,
    onSongChange,
    setIsPlaying,
  ]);

  // Extract colors when song changes
  useEffect(() => {
    if (currentSong?.image?.[2]?.url) {
      extractColorsFromImage(currentSong.image[2].url).then((colors) => {
        setDominantColors(colors);
      });
    }
  }, [currentSong?.id]);

  if (!isOpen || !currentSong) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden transition-all duration-1000 ease-out"
      style={{
        background: `linear-gradient(135deg, ${dominantColors.primary} 0%, ${dominantColors.secondary} 50%, ${dominantColors.accent} 100%)`,
      }}
    >
      {/* Enhanced Ambient Background */}
      <div className="absolute inset-0">
        {/* Multiple layered background images for better ambient effect */}
        {currentSong.image?.[2]?.url && (
          <>
            {/* Base blurred image */}
            <img
              src={currentSong.image[2].url}
              alt={currentSong.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 transition-all duration-1000"
            />
            {/* Secondary ambient layer */}
            <img
              src={currentSong.image[2].url}
              alt={currentSong.name}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[100px] scale-150 transition-all duration-1000"
            />
            {/* Tertiary glow layer */}
            <img
              src={currentSong.image[2].url}
              alt={currentSong.name}
              className="absolute inset-0 w-full h-full object-cover opacity-5 blur-[150px] scale-[2] transition-all duration-1000"
            />
          </>
        )}

        {/* Dynamic gradient overlay based on extracted colors */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(ellipse at top, ${dominantColors.primary}15 0%, transparent 50%),
              radial-gradient(ellipse at bottom left, ${dominantColors.secondary}20 0%, transparent 50%),
              radial-gradient(ellipse at bottom right, ${dominantColors.accent}15 0%, transparent 50%),
              linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)
            `,
          }}
        />

        {/* Color wash overlay */}
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-40 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(circle at 30% 20%, ${dominantColors.primary}30 0%, transparent 40%),
              radial-gradient(circle at 70% 80%, ${dominantColors.secondary}25 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, ${dominantColors.accent}20 0%, transparent 60%)
            `,
          }}
        />

        {/* Subtle noise texture for depth */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col h-full text-white safe-area-inset transition-all duration-300 ${
          showPlaylist ? "md:mr-80" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded-full p-2"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <p className="text-sm font-medium opacity-80">Playing from</p>
            <p className="text-xs opacity-60">{playingFrom}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 rounded-full p-2"
          >
            <MoreHorizontal className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Content - Mobile First Design */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-12 pb-4 sm:pb-6 min-h-0 overflow-hidden">
          {/* Mobile Layout */}
          <div className="md:hidden flex-1 flex flex-col">
            {/* Album Art Container - Clean without white frame */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="max-w-[320px] w-full">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900">
                  {currentSong.image?.[2]?.url ? (
                    <img
                      src={currentSong.image[2].url}
                      alt={currentSong.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-16 h-16 text-white/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Song Info */}
            <div className="px-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white mb-1 truncate">
                    {decodeHtmlEntities(currentSong.name)}
                  </h1>
                  <p className="text-base text-white/70 truncate">
                    {getArtistNames(currentSong)}
                  </p>
                </div>

                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLikeToggle}
                  className={`flex-shrink-0 ml-4 ${
                    isLiked(currentSong.id) ? "text-green-500" : "text-white/60"
                  }`}
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isLiked(currentSong.id) ? "fill-green-500" : ""
                    }`}
                  />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={onSeek}
                  className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_.bg-primary]:bg-white"
                />
                <div className="flex justify-between text-sm text-white/60 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={`${
                    isShuffled ? "text-green-400" : "text-white/60"
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handlePrevious}
                  disabled={playlist.length === 0}
                  className="text-white"
                >
                  <SkipBack className="w-7 h-7" />
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  onClick={onTogglePlayPause}
                  className="rounded-full w-16 h-16 bg-white text-black hover:bg-white/90"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleNext}
                  disabled={playlist.length === 0}
                  className="text-white"
                >
                  <SkipForward className="w-7 h-7" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRepeat}
                  className={`relative ${
                    repeatMode !== "off" ? "text-green-400" : "text-white/60"
                  }`}
                >
                  <Repeat className="w-5 h-5" />
                  {repeatMode === "one" && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                      1
                    </span>
                  )}
                </Button>
              </div>

              {/* Bottom Actions - Mobile (corner aligned) */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="text-white/60"
                >
                  <ListMusic className="w-6 h-6" />
                </Button>

                <Button variant="ghost" size="sm" className="text-white/60">
                  <Share className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Layout - Professional Design */}
          <div className="hidden md:flex items-center justify-center h-full">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl w-full px-8">
              {/* Left Side - Album Art */}
              <div className="flex-shrink-0">
                <div className="w-[350px] h-[350px] lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-800 to-gray-900">
                  {currentSong.image?.[2]?.url ? (
                    <img
                      src={currentSong.image[2].url}
                      alt={currentSong.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-24 h-24 text-white/50" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Controls and Info */}
              <div className="flex-1 flex flex-col justify-center max-w-lg">
                {/* Song Info with Like Button */}
                <div className="mb-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0 pr-4">
                      <h1 className="text-3xl xl:text-4xl font-bold mb-3 leading-tight">
                        <span
                          className="block truncate"
                          title={decodeHtmlEntities(currentSong.name)}
                        >
                          {decodeHtmlEntities(currentSong.name)}
                        </span>
                      </h1>
                      <p className="text-xl text-white/70">
                        <span
                          className="block truncate"
                          title={getArtistNames(currentSong)}
                        >
                          {getArtistNames(currentSong)}
                        </span>
                      </p>
                    </div>

                    {/* Like Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLikeToggle}
                      className={`flex-shrink-0 text-white hover:bg-white/10 rounded-full p-3 ${
                        isLiked(currentSong.id)
                          ? "text-green-500"
                          : "text-white/60"
                      }`}
                    >
                      <Heart
                        className={`w-7 h-7 ${
                          isLiked(currentSong.id) ? "fill-green-500" : ""
                        }`}
                      />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-8">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={1}
                      onValueChange={onSeek}
                      className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_.bg-primary]:bg-white"
                    />
                    <div className="flex justify-between text-base text-white/60 mt-3">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-center gap-6 mb-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsShuffled(!isShuffled)}
                    className={`text-white hover:bg-white/10 rounded-full p-3 ${
                      isShuffled ? "text-green-400" : "text-white/60"
                    }`}
                  >
                    <Shuffle className="w-6 h-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handlePrevious}
                    disabled={playlist.length === 0}
                    className="text-white hover:bg-white/10 rounded-full p-4"
                  >
                    <SkipBack className="w-7 h-7" />
                  </Button>

                  <Button
                    variant="default"
                    size="lg"
                    onClick={onTogglePlayPause}
                    className="rounded-full w-16 h-16 bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-200"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleNext}
                    disabled={playlist.length === 0}
                    className="text-white hover:bg-white/10 rounded-full p-4"
                  >
                    <SkipForward className="w-7 h-7" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRepeat}
                    className={`text-white hover:bg-white/10 rounded-full p-3 relative ${
                      repeatMode !== "off" ? "text-green-400" : "text-white/60"
                    }`}
                  >
                    <Repeat className="w-6 h-6" />
                    {repeatMode === "one" && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                        1
                      </span>
                    )}
                  </Button>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className="text-white/60 hover:bg-white/10 rounded-full p-3"
                  >
                    <ListMusic className="w-6 h-6" />
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVolumeChange([volume === 0 ? 0.7 : 0])}
                      className="text-white/60 hover:bg-white/10 rounded-full p-3"
                    >
                      {volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    <Slider
                      value={[volume]}
                      max={1}
                      step={0.1}
                      onValueChange={onVolumeChange}
                      className="w-24 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-white/60"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:bg-white/10 rounded-full p-3"
                  >
                    <Share className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Sidebar - Mobile Full Screen, Desktop Sidebar */}
      {showPlaylist && (
        <>
          {/* Mobile: Full screen overlay */}
          <div className="md:hidden fixed inset-0 bg-black/95 backdrop-blur-xl z-20">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Queue</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaylist(false)}
                  className="text-white/60 hover:bg-white/10 rounded-full p-2"
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {playlist.map((song, index) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      onSongChange?.(song, index);
                      setShowPlaylist(false); // Close queue on mobile after selection
                    }}
                    className={`flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer ${
                      song.id === currentSong.id ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded bg-white/10 overflow-hidden flex-shrink-0">
                      {song.image?.[0]?.url ? (
                        <img
                          src={song.image[0].url}
                          alt={song.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate text-base ${
                          song.id === currentSong.id
                            ? "text-green-400"
                            : "text-white"
                        }`}
                      >
                        {decodeHtmlEntities(song.name)}
                      </p>
                      <p className="text-sm text-white/60 truncate">
                        {decodeHtmlEntities(getArtistNames(song))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop: Right sidebar */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Queue</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaylist(false)}
                  className="text-white/60 hover:bg-white/10"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto h-full pb-20 scrollbar-hide">
              {playlist.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => onSongChange?.(song, index)}
                  className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer ${
                    song.id === currentSong.id ? "bg-white/10" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                    {song.image?.[0]?.url ? (
                      <img
                        src={song.image[0].url}
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-3 h-3 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate text-sm ${
                        song.id === currentSong.id
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {decodeHtmlEntities(song.name)}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {decodeHtmlEntities(getArtistNames(song))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
