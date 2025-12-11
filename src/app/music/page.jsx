/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
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
import { Play, Heart, List, Search } from "lucide-react";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";
import UserActivityTracker from "@/components/analytics/UserActivityTracker";

export default function MusicPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [, setCurrentlyPlaying] = useState(null);
  const [newReleases, setNewReleases] = useState([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [topHitsPlaylists, setTopHitsPlaylists] = useState([]);
  const [englishTopPlaylists, setEnglishTopPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [topHitsLoading, setTopHitsLoading] = useState(true);
  const [englishTopLoading, setEnglishTopLoading] = useState(true);
  const [playlistColors, setPlaylistColors] = useState({});

  // Initialize liked playlists hook
  const { likedPlaylists, loading: playlistsLoading } = useLikedPlaylists(
    session?.user?.id
  );
  const [playlistsWithCovers, setPlaylistsWithCovers] = useState([]);

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=new%20releases&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setNewReleases(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching new releases:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTrendingPlaylists = async () => {
      try {
        setTrendingLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=trending&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setTrendingPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching trending playlists:", error);
      } finally {
        setTrendingLoading(false);
      }
    };

    const fetchTopHitsPlaylists = async () => {
      try {
        setTopHitsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=top%20hits&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setTopHitsPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching top hits playlists:", error);
      } finally {
        setTopHitsLoading(false);
      }
    };

    const fetchEnglishTopPlaylists = async () => {
      try {
        setEnglishTopLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=english%20top&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setEnglishTopPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching english top playlists:", error);
      } finally {
        setEnglishTopLoading(false);
      }
    };

    fetchNewReleases();
    fetchTrendingPlaylists();
    fetchTopHitsPlaylists();
    fetchEnglishTopPlaylists();
  }, []);

  const handlePlayClick = (item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  };

  const handleCardClick = (item, type) => {
    if (type === "playlist" && typeof item === "object" && item.id) {
      // Navigate to playlist detail page with songCount
      router.push(
        `/music/playlist/${item.id}?songCount=${item.songCount || 50}`
      );
    } else {
      console.log(`Clicked ${type}:`, item);
    }
  };

  const handleShowAll = () => {
    // Navigate to existing new releases page
    router.push("/music/discover/new-releases");
  };

  // Extract dominant color from image
  const extractDominantColor = (imageUrl, playlistId) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

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

            const color = `${Math.floor(r / 15) * 15},${
              Math.floor(g / 15) * 15
            },${Math.floor(b / 15) * 15}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          // Find the most common color
          let dominantColor = "59,130,246"; // Default blue
          let maxCount = 0;

          for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantColor = color;
            }
          }

          const rgbColor = `rgb(${dominantColor})`;
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: rgbColor,
          }));
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          const fallbackColor = "rgb(59,130,246)";
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: fallbackColor,
          }));
          resolve(fallbackColor);
        }
      };

      img.onerror = () => {
        const fallbackColor = "rgb(59,130,246)";
        setPlaylistColors((prev) => ({
          ...prev,
          [playlistId]: fallbackColor,
        }));
        resolve(fallbackColor);
      };

      img.src = imageUrl;
    });
  };

  // Fetch song data for user-created playlists and generate covers
  useEffect(() => {
    const fetchPlaylistCovers = async () => {
      if (!playlistsLoading && likedPlaylists.length > 0) {
        const playlistsWithCoversData = await Promise.all(
          likedPlaylists.slice(0, 5).map(async (playlist) => {
            // Check if it's a user-created playlist (MongoDB ObjectId format)
            const isUserPlaylist =
              playlist.playlistId &&
              playlist.playlistId.length === 24 &&
              /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

            if (isUserPlaylist) {
              try {
                // Fetch the actual playlist data to get song IDs
                const playlistResponse = await fetch(
                  `/api/playlists/${playlist.playlistId}`
                );
                const playlistResult = await playlistResponse.json();

                if (playlistResult.success && playlistResult.data) {
                  // Check if playlist is private and user is not the owner
                  if (
                    !playlistResult.data.isPublic &&
                    !playlistResult.data.isOwner
                  ) {
                    return null; // Filter out private playlists
                  }

                  if (
                    playlistResult.data.songIds &&
                    playlistResult.data.songIds.length > 0
                  ) {
                    // Fetch first few songs for cover generation
                    const songsToFetch = playlistResult.data.songIds.slice(
                      0,
                      4
                    );
                    const songPromises = songsToFetch.map(async (songId) => {
                      try {
                        const response = await fetch(
                          `https://jiosaavn-api-blush.vercel.app/api/songs?ids=${songId}`
                        );
                        const data = await response.json();
                        if (data.success && data.data && data.data.length > 0) {
                          return data.data[0];
                        }
                        return null;
                      } catch (error) {
                        console.error(`Error fetching song ${songId}:`, error);
                        return null;
                      }
                    });

                    const fetchedSongs = await Promise.all(songPromises);
                    const validSongs = fetchedSongs.filter(
                      (song) => song !== null
                    );

                    return {
                      ...playlist,
                      songs: validSongs,
                      actualPlaylistData: playlistResult.data,
                      songCount: playlistResult.data.songIds?.length || 0,
                    };
                  }
                }
              } catch (error) {
                console.error("Error fetching playlist data:", error);
              }
            } else {
              // For API playlists, extract color from existing image
              const imageUrl =
                playlist.image?.[2]?.url ||
                playlist.image?.[1]?.url ||
                playlist.image?.[0]?.url;
              if (imageUrl && !playlistColors[playlist.playlistId]) {
                extractDominantColor(imageUrl, playlist.playlistId);
              }
            }

            return playlist;
          })
        );

        // Filter out null values (private playlists)
        const filteredPlaylists = playlistsWithCoversData.filter(
          (playlist) => playlist !== null
        );
        setPlaylistsWithCovers(filteredPlaylists);
      }
    };

    fetchPlaylistCovers();
  }, [likedPlaylists, playlistsLoading, playlistColors]);

  // Generate playlist cover based on songs (same logic as library page)
  const getPlaylistCover = (playlist) => {
    const songs = playlist.songs || [];

    if (!songs || songs.length === 0) {
      return { type: "default", src: "/def playlist image.jpg" };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      // Use first song's cover image
      const firstSong = songs[0];
      const imageUrl =
        firstSong.image?.find((img) => img.quality === "500x500")?.url ||
        firstSong.image?.find((img) => img.quality === "150x150")?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: "single",
        src: imageUrl || "/def playlist image.jpg",
        song: firstSong,
      };
    }

    if (songs.length >= 4) {
      // Create 4-image collage from first 4 songs
      const firstFourSongs = songs.slice(0, 4);
      const images = firstFourSongs.map((song) => {
        return (
          song.image?.find((img) => img.quality === "150x150")?.url ||
          song.image?.find((img) => img.quality === "500x500")?.url ||
          song.image?.[song.image.length - 1]?.url ||
          "/def playlist image.jpg"
        );
      });

      return {
        type: "collage",
        images: images,
        songs: firstFourSongs,
      };
    }

    return { type: "default", src: "/def playlist image.jpg" };
  };

  return (
    <SidebarProvider>
      {/* Track user activity for analytics */}
      <UserActivityTracker />
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Discover</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Search Button */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => router.push("/music/search")}
                className="flex items-center justify-start gap-3 bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 transition-all duration-200 rounded-full h-9 w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 px-4"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="hidden sm:block text-sm text-muted-foreground text-left truncate">
                  Search music...
                </span>
                <span className="sm:hidden text-xs text-muted-foreground">
                  Search
                </span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-6 md:space-y-8">
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            {/* Liked Songs */}
            <div
              className="rounded-lg p-3 md:p-4 relative overflow-hidden cursor-pointer transition-all duration-300 flex items-center gap-2 md:gap-3 h-16 md:h-20 group"
              style={{
                backgroundColor: "rgba(147, 51, 234, 0.15)", // Purple ambient
                "--hover-color": "rgba(147, 51, 234, 0.25)",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(147, 51, 234, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "rgba(147, 51, 234, 0.15)";
              }}
              onClick={() => router.push("/music/favorites")}
            >
              <div
                className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0 shadow-lg overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(147, 51, 234), rgba(147, 51, 234, 0.8))",
                }}
              >
                <Heart className="w-6 h-6 fill-current text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  Liked Songs
                </h3>
              </div>

              {/* Play button overlay */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  className="rounded-full w-10 h-10 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick({ type: "liked-songs" }, "liked-songs");
                  }}
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>

            {/* Dynamic Liked Playlists */}
            {playlistsLoading
              ? // Loading skeleton for playlists
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="bg-muted/50 rounded-lg p-3 md:p-4 flex items-center gap-2 md:gap-3 h-16 md:h-20 animate-pulse"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-sm shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 md:h-4 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                ))
              : (playlistsWithCovers.length > 0
                  ? playlistsWithCovers
                  : likedPlaylists
                )
                  .slice(0, 5)
                  .map((playlist) => {
                    const dominantColor =
                      playlistColors[playlist.playlistId] || "rgb(59,130,246)";
                    const rgbValues = dominantColor.match(/\d+/g);
                    const ambientColor = rgbValues
                      ? `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.15)`
                      : "rgba(59,130,246,0.15)";
                    const hoverColor = rgbValues
                      ? `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.25)`
                      : "rgba(59,130,246,0.25)";

                    return (
                      <div
                        key={playlist.playlistId}
                        className="rounded-lg p-3 md:p-4 relative overflow-hidden cursor-pointer transition-all duration-300 flex items-center gap-2 md:gap-3 h-16 md:h-20 group"
                        style={{
                          backgroundColor: ambientColor,
                          "--hover-color": hoverColor,
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = hoverColor;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = ambientColor;
                        }}
                        onClick={() => {
                          // Check if it's a user-created playlist (MongoDB ObjectId format) or API playlist
                          const isUserPlaylist =
                            playlist.playlistId &&
                            playlist.playlistId.length === 24 &&
                            /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

                          if (isUserPlaylist) {
                            // User-created playlist - use /music/playlists/{id}
                            router.push(
                              `/music/playlists/${playlist.playlistId}`
                            );
                          } else {
                            // API playlist - use /music/playlist/{id}
                            router.push(
                              `/music/playlist/${
                                playlist.playlistId
                              }?songCount=${playlist.songCount || 50}`
                            );
                          }
                        }}
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm shrink-0 shadow-lg overflow-hidden relative">
                          {(() => {
                            // Check if it's a user-created playlist with songs data
                            const isUserPlaylist =
                              playlist.playlistId &&
                              playlist.playlistId.length === 24 &&
                              /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

                            if (isUserPlaylist && playlist.songs) {
                              // Use dynamic cover generation for user playlists
                              const cover = getPlaylistCover(playlist);

                              if (cover.type === "single") {
                                return (
                                  <img
                                    src={cover.src}
                                    alt={playlist.playlistName || "Playlist"}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.src = "/def playlist image.jpg";
                                    }}
                                  />
                                );
                              } else if (cover.type === "collage") {
                                return (
                                  <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black">
                                    {cover.images.map((imageSrc, index) => (
                                      <div
                                        key={index}
                                        className="w-full h-full overflow-hidden"
                                      >
                                        <img
                                          src={imageSrc}
                                          alt={`Song ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            e.target.src =
                                              "/def playlist image.jpg";
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                return (
                                  <img
                                    src="/def playlist image.jpg"
                                    alt={playlist.playlistName || "Playlist"}
                                    className="w-full h-full object-cover"
                                  />
                                );
                              }
                            } else if (
                              playlist.image?.[2]?.url ||
                              playlist.image?.[1]?.url ||
                              playlist.image?.[0]?.url
                            ) {
                              // Use API playlist image for JioSaavn playlists
                              return (
                                <img
                                  src={
                                    playlist.image[2]?.url ||
                                    playlist.image[1]?.url ||
                                    playlist.image[0]?.url
                                  }
                                  alt={playlist.playlistName || "Playlist"}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    const fallback =
                                      e.target.nextElementSibling;
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                    }
                                  }}
                                />
                              );
                            } else {
                              // Fallback to default icon
                              return (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{
                                    background: `linear-gradient(135deg, ${dominantColor}, ${dominantColor
                                      .replace("rgb", "rgba")
                                      .replace(")", ", 0.8)")})`,
                                  }}
                                >
                                  <List className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                              );
                            }
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-xs md:text-sm text-foreground truncate">
                            {playlist.playlistName}
                          </h3>
                        </div>

                        {/* Play button overlay */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                          <Button
                            size="sm"
                            className="rounded-full w-8 h-8 md:w-10 md:h-10 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayClick(playlist, "playlist");
                            }}
                          >
                            <Play className="w-3 h-3 md:w-4 md:h-4 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
          </div>

          {/* "New release" */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold">New Release</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowAll}
                className="text-xs md:text-sm"
              >
                Show all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {loading
                ? // Loading skeleton
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                      <div className="bg-muted animate-pulse h-4 rounded" />
                      <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                    </div>
                  ))
                : newReleases.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleCardClick(playlist, "playlist")}
                    >
                      <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                        <img
                          src={
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url
                          }
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder-music.jpg";
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
                  ))}
            </div>
          </div>

          {/* Trending Playlists Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold">
                Trending Playlists
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/music/discover/playlists")}
                className="text-xs md:text-sm"
              >
                Show all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {trendingLoading
                ? // Loading skeleton
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                      <div className="bg-muted animate-pulse h-4 rounded" />
                      <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                    </div>
                  ))
                : trendingPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleCardClick(playlist, "playlist")}
                    >
                      <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                        <img
                          src={
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url
                          }
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder-music.jpg";
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
                  ))}
            </div>
          </div>

          {/* Top Hits Playlists Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold">
                Top Hits Playlists
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/music/discover/top-hits")}
                className="text-xs md:text-sm"
              >
                Show all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {topHitsLoading
                ? // Loading skeleton
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                      <div className="bg-muted animate-pulse h-4 rounded" />
                      <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                    </div>
                  ))
                : topHitsPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleCardClick(playlist, "playlist")}
                    >
                      <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                        <img
                          src={
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url
                          }
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder-music.jpg";
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
                  ))}
            </div>
          </div>

          {/* English Top Playlists Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold">
                English Top Playlists
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/music/discover/english-top")}
                className="text-xs md:text-sm"
              >
                Show all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {englishTopLoading
                ? // Loading skeleton
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                      <div className="bg-muted animate-pulse h-4 rounded" />
                      <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                    </div>
                  ))
                : englishTopPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="group cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleCardClick(playlist, "playlist")}
                    >
                      <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                        <img
                          src={
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url
                          }
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder-music.jpg";
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
                  ))}
            </div>
          </div>

          {/* Bottom padding to prevent content being hidden behind music player */}
          <div className="pb-24" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
