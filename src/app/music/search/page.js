"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Play, Heart, Pause } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useLikedSongs } from "@/hooks/useLikedSongs";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { playSong, currentSong, isPlaying } = useMusicPlayer();
  const { toggleLike, isLiked } = useLikedSongs('shree jaybhay');

  // Debounced search function
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      console.log('Search API Response:', data);

      if (data.success) {
        // Transform the API response to match our expected structure
        const transformedData = {
          topQuery: data.data.topQuery?.results?.[0] || null,
          songs: data.data.songs || { results: [] },
          albums: data.data.albums || { results: [] },
          artists: data.data.artists || { results: [] },
          playlists: data.data.playlists || { results: [] }
        };

        // Enhance artists section by adding song artists if they're not already included
        if (transformedData.songs?.results?.length > 0) {
          const existingArtistNames = new Set(
            transformedData.artists.results.map(artist =>
              artist.title?.toLowerCase() || artist.name?.toLowerCase()
            )
          );

          // Get unique artists from top songs with proper IDs by fetching detailed song info
          const songArtists = [];

          // Process top 3 songs to extract their artists
          for (const song of transformedData.songs.results.slice(0, 3)) {
            try {
              // Fetch detailed song info to get proper artist data with IDs
              const songResponse = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs/${song.id}`);
              const songData = await songResponse.json();

              if (songData.success && songData.data?.[0]?.artists?.primary) {
                // Use the detailed artist information with real IDs
                songData.data[0].artists.primary.forEach(artist => {
                  const artistName = artist.name;
                  if (artistName && !existingArtistNames.has(artistName.toLowerCase())) {
                    songArtists.push({
                      id: artist.id, // Real artist ID from detailed API
                      title: artistName,
                      name: artistName,
                      type: 'artist',
                      image: artist.image || song.image || [],
                      isSongArtist: true,
                      needsSearch: false // We have the real ID
                    });
                    existingArtistNames.add(artistName.toLowerCase());
                  }
                });
              } else {
                // Fallback to parsing primaryArtists string if detailed fetch fails
                const artistName = getArtistNames(song);
                if (artistName && artistName !== 'Unknown Artist') {
                  const artists = artistName.split(',').map(name => name.trim());
                  artists.forEach(name => {
                    if (!existingArtistNames.has(name.toLowerCase())) {
                      songArtists.push({
                        id: `search-${name.toLowerCase().replace(/\s+/g, '-')}`,
                        title: name,
                        name: name,
                        type: 'artist',
                        image: song.image || [],
                        isSongArtist: true,
                        needsSearch: true // Flag that we need to search for real ID
                      });
                      existingArtistNames.add(name.toLowerCase());
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Error fetching song details for artist extraction:', error);
              // Fallback to basic artist extraction
              const artistName = getArtistNames(song);
              if (artistName && artistName !== 'Unknown Artist') {
                const artists = artistName.split(',').map(name => name.trim());
                artists.forEach(name => {
                  if (!existingArtistNames.has(name.toLowerCase())) {
                    songArtists.push({
                      id: `search-${name.toLowerCase().replace(/\s+/g, '-')}`,
                      title: name,
                      name: name,
                      type: 'artist',
                      image: song.image || [],
                      isSongArtist: true,
                      needsSearch: true
                    });
                    existingArtistNames.add(name.toLowerCase());
                  }
                });
              }
            }
          }

          // Add song artists to the beginning of artists array
          if (songArtists.length > 0) {
            transformedData.artists.results = [...songArtists, ...transformedData.artists.results];
          }
        }

        setSearchResults(transformedData);
      } else {
        console.error('Search failed:', data.message);
        // Don't clear results on error, keep previous results to prevent layout shift
      }
    } catch (error) {
      console.error('Search error:', error);
      // Don't clear results on error, keep previous results to prevent layout shift
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query) => performSearch(query), 500),
    []
  );

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handlePlayClick = async (song, playlist = []) => {
    // If the song doesn't have detailed data (no downloadUrl), fetch it
    if (!song.downloadUrl && song.id) {
      try {
        const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs/${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          const detailedSong = data.data[0];
          playSong(detailedSong, playlist);
          return;
        }
      } catch (error) {
        console.error('Error fetching song details:', error);
      }
    }

    playSong(song, playlist);
  };

  const handleArtistClick = async (artistId, artistName = null) => {
    // If it's a generated ID (starts with 'search-'), we need to find the real artist ID
    if (artistId.startsWith('search-') && artistName) {
      try {
        // Search for the artist to get their real ID
        const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/search?query=${encodeURIComponent(artistName)}`);
        const data = await response.json();

        if (data.success && data.data.artists?.results?.length > 0) {
          // Find the exact artist match
          const exactMatch = data.data.artists.results.find(artist =>
            artist.title?.toLowerCase() === artistName.toLowerCase() ||
            artist.name?.toLowerCase() === artistName.toLowerCase()
          );

          if (exactMatch && exactMatch.id) {
            router.push(`/music/artist/${exactMatch.id}`);
            return;
          }

          // If no exact match, use the first result
          if (data.data.artists.results[0]?.id) {
            router.push(`/music/artist/${data.data.artists.results[0].id}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error searching for artist:', error);
      }

      // Fallback: show a message or redirect to search
      console.log(`Could not find artist page for: ${artistName}`);
      return;
    }

    // Use the provided ID directly
    router.push(`/music/artist/${artistId}`);
  };

  const handleAlbumClick = (albumId) => {
    router.push(`/music/album/${albumId}`);
  };

  const handlePlaylistClick = (playlistId) => {
    router.push(`/music/playlist/${playlistId}`);
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

  const getArtistNames = (item) => {
    // Handle detailed song API response (artists.primary array) - prioritize this
    if (item.artists?.primary && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
      return item.artists.primary.map(artist => artist.name || artist).join(', ');
    }

    // Handle search API response (primaryArtists string)
    if (item.primaryArtists && typeof item.primaryArtists === 'string') {
      return item.primaryArtists;
    }

    if (item.artist && typeof item.artist === 'string') {
      return item.artist;
    }

    if (item.singers && typeof item.singers === 'string') {
      return item.singers;
    }

    return 'Unknown Artist';
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                  <BreadcrumbPage>Search</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col pb-24">
          {/* Search Input */}
          <div className="p-6 pb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="What do you want to listen to?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0 h-12 text-base"
              />
            </div>
          </div>

          {searchResults && (
            <div className="px-6 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-5 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="songs">Songs</TabsTrigger>
                  <TabsTrigger value="albums">Albums</TabsTrigger>
                  <TabsTrigger value="artists">Artists</TabsTrigger>
                  <TabsTrigger value="playlists">Playlists</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Result */}
                    {(searchResults.topQuery || (searchResults.songs?.results?.length > 0)) && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Top result</h2>
                        {(() => {
                          const topResult = searchResults.topQuery || searchResults.songs.results[0];
                          const resultType = topResult.type || 'song';

                          return (
                            <div
                              className="bg-muted/30 rounded-lg p-6 relative overflow-hidden cursor-pointer group hover:bg-muted/40 transition-colors"
                              onClick={() => {
                                if (resultType === 'song') {
                                  handlePlayClick(topResult, searchResults.songs?.results || [topResult]);
                                } else if (resultType === 'artist') {
                                  handleArtistClick(topResult.id);
                                } else if (resultType === 'album') {
                                  handleAlbumClick(topResult.id);
                                }
                              }}
                            >
                              <div className="relative z-10">
                                <div className="mb-4">
                                  <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden">
                                    {topResult.image?.[2]?.url ? (
                                      <img
                                        src={topResult.image[2].url}
                                        alt={topResult.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                        <Play className="w-8 h-8 text-white/70" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h3 className="text-4xl font-bold leading-tight">
                                    {decodeHtmlEntities(topResult.title)}
                                  </h3>

                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="capitalize text-sm font-medium">
                                      {resultType}
                                    </span>
                                    {(topResult.primaryArtists || topResult.artist) && (
                                      <>
                                        <span className="text-sm">•</span>
                                        <span className="text-sm">
                                          {getArtistNames(topResult)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Button
                                size="icon"
                                className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 rounded-full w-14 h-14"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (resultType === 'song') {
                                    handlePlayClick(topResult, searchResults.songs?.results || [topResult]);
                                  }
                                }}
                              >
                                <Play className="w-6 h-6 ml-0.5" />
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Songs Section */}
                    {searchResults.songs?.results?.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Songs</h2>
                        <div className="space-y-1">
                          {searchResults.songs.results.slice(0, 4).map((song, index) => {
                            const isCurrentSong = currentSong?.id === song.id;
                            return (
                              <div
                                key={song.id || index}
                                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 group cursor-pointer transition-colors ${isCurrentSong ? 'bg-muted/30' : ''
                                  }`}
                                onClick={() => handlePlayClick(song, searchResults.songs.results)}
                              >
                                <div className="relative">
                                  <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                                    {song.image?.[1]?.url ? (
                                      <img
                                        src={song.image[1].url}
                                        alt={song.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                        <Play className="w-3 h-3 text-white/70" />
                                      </div>
                                    )}
                                  </div>
                                  {isCurrentSong && isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                                    }`}>
                                    {decodeHtmlEntities(song.title || song.name)}
                                  </p>
                                  <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                    }`}>
                                    {getArtistNames(song)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 ${isLiked(song.id) ? 'text-green-500 opacity-100' : ''
                                      }`}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        // Fetch detailed song info to get complete data for liking
                                        let detailedSong = song;

                                        if (!song.downloadUrl && song.id) {
                                          const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs/${song.id}`);
                                          const data = await response.json();

                                          if (data.success && data.data && data.data.length > 0) {
                                            detailedSong = data.data[0];
                                          }
                                        }

                                        // Create proper song data structure for the like function
                                        const songData = {
                                          id: detailedSong.id,
                                          name: detailedSong.name || detailedSong.title,
                                          title: detailedSong.name || detailedSong.title,
                                          artists: detailedSong.artists || { primary: [] },
                                          primaryArtists: detailedSong.primaryArtists || getArtistNames(detailedSong),
                                          album: detailedSong.album || { id: '', name: song.album || '' },
                                          duration: detailedSong.duration || 0,
                                          image: detailedSong.image || [],
                                          releaseDate: detailedSong.releaseDate || '',
                                          language: detailedSong.language || '',
                                          playCount: detailedSong.playCount || 0,
                                          downloadUrl: detailedSong.downloadUrl || [],
                                          url: detailedSong.url || '',
                                          type: 'song'
                                        };
                                        await toggleLike(songData);
                                      } catch (error) {
                                        console.error('Error toggling like:', error);
                                      }
                                    }}
                                  >
                                    {isLiked(song.id) ? (
                                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                                    ) : (
                                      <Heart className="w-3 h-3" />
                                    )}
                                  </Button>
                                  {song.duration ? (
                                    <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                                      {formatDuration(song.duration)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Artists Section */}
                  {searchResults.artists?.results?.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Artists</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {searchResults.artists.results.slice(0, 6).map((artist, index) => (
                          <div
                            key={artist.id || index}
                            className="text-center group cursor-pointer"
                            onClick={() => handleArtistClick(artist.id, artist.title || artist.name)}
                          >
                            <div className="w-full aspect-square rounded-full bg-muted mb-3 overflow-hidden">
                              {(() => {
                                // Try different image sizes: high quality first, then medium, then low
                                const imageUrl = artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url;

                                if (imageUrl) {
                                  return (
                                    <img
                                      src={imageUrl}
                                      alt={artist.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // If image fails to load, show gradient fallback
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  );
                                }

                                return (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                    <div className="text-white text-2xl font-bold">
                                      {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                                    </div>
                                  </div>
                                );
                              })()}
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600" style={{ display: 'none' }}>
                                <div className="text-white text-2xl font-bold">
                                  {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                              </div>
                            </div>
                            <p className="font-medium truncate text-sm">
                              {decodeHtmlEntities(artist.title)}
                            </p>
                            <p className="text-xs text-muted-foreground">Artist</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Albums Section */}
                  {searchResults.albums?.results?.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Albums</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {searchResults.albums.results.slice(0, 6).map((album, index) => (
                          <div
                            key={album.id || index}
                            className="group cursor-pointer"
                            onClick={() => handleAlbumClick(album.id)}
                          >
                            <div className="w-full aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                              {album.image?.[2]?.url ? (
                                <img
                                  src={album.image[2].url}
                                  alt={album.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                  <Play className="w-8 h-8 text-white/70" />
                                </div>
                              )}
                            </div>
                            <p className="font-medium truncate text-sm">
                              {decodeHtmlEntities(album.title)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {album.year} • {getArtistNames(album)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playlists Section */}
                  {searchResults.playlists?.results?.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Playlists</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {searchResults.playlists.results.slice(0, 6).map((playlist, index) => (
                          <div
                            key={playlist.id || index}
                            className="group cursor-pointer"
                            onClick={() => handlePlaylistClick(playlist.id)}
                          >
                            <div className="w-full aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                              {playlist.image?.[2]?.url ? (
                                <img
                                  src={playlist.image[2].url}
                                  alt={playlist.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                  <Play className="w-8 h-8 text-white/70" />
                                </div>
                              )}
                            </div>
                            <p className="font-medium truncate text-sm">
                              {decodeHtmlEntities(playlist.title)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              By {playlist.subtitle || 'Various Artists'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Songs Tab */}
                <TabsContent value="songs">
                  {searchResults.songs?.results?.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.songs.results.map((song, index) => {
                        const isCurrentSong = currentSong?.id === song.id;
                        return (
                          <div
                            key={song.id || index}
                            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                              }`}
                            onClick={() => handlePlayClick(song, searchResults.songs.results)}
                          >
                            <div className="relative">
                              <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                                {song.image?.[1]?.url ? (
                                  <img
                                    src={song.image[1].url}
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                    <Play className="w-4 h-4 text-white/70" />
                                  </div>
                                )}
                              </div>
                              {isCurrentSong && isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                                }`}>
                                {decodeHtmlEntities(song.title)}
                              </p>
                              <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                }`}>
                                {getArtistNames(song)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 ${isLiked(song.id) ? 'text-green-500 opacity-100' : ''
                                  }`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // Fetch detailed song info to get complete data for liking
                                    let detailedSong = song;

                                    if (!song.downloadUrl && song.id) {
                                      const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs/${song.id}`);
                                      const data = await response.json();

                                      if (data.success && data.data && data.data.length > 0) {
                                        detailedSong = data.data[0];
                                      }
                                    }

                                    // Create proper song data structure for the like function
                                    const songData = {
                                      id: detailedSong.id,
                                      name: detailedSong.name || detailedSong.title,
                                      title: detailedSong.name || detailedSong.title,
                                      artists: detailedSong.artists || { primary: [] },
                                      primaryArtists: detailedSong.primaryArtists || getArtistNames(detailedSong),
                                      album: detailedSong.album || { id: '', name: song.album || '' },
                                      duration: detailedSong.duration || 0,
                                      image: detailedSong.image || [],
                                      releaseDate: detailedSong.releaseDate || '',
                                      language: detailedSong.language || '',
                                      playCount: detailedSong.playCount || 0,
                                      downloadUrl: detailedSong.downloadUrl || [],
                                      url: detailedSong.url || '',
                                      type: 'song'
                                    };
                                    await toggleLike(songData);
                                  } catch (error) {
                                    console.error('Error toggling like:', error);
                                  }
                                }}
                              >
                                {isLiked(song.id) ? (
                                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                                ) : (
                                  <Heart className="w-4 h-4" />
                                )}
                              </Button>
                              {song.duration ? (
                                <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                                  {formatDuration(song.duration)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No songs found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Albums Tab */}
                <TabsContent value="albums">
                  {searchResults.albums?.results?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {searchResults.albums.results.map((album, index) => (
                        <div
                          key={album.id || index}
                          className="group cursor-pointer"
                          onClick={() => handleAlbumClick(album.id)}
                        >
                          <div className="w-full aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                            {album.image?.[2]?.url ? (
                              <img
                                src={album.image[2].url}
                                alt={album.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                <Play className="w-8 h-8 text-white/70" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium truncate text-sm">
                            {decodeHtmlEntities(album.title)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {album.year} • {getArtistNames(album)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No albums found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Artists Tab */}
                <TabsContent value="artists">
                  {searchResults.artists?.results?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {searchResults.artists.results.map((artist, index) => (
                        <div
                          key={artist.id || index}
                          className="text-center group cursor-pointer"
                          onClick={() => handleArtistClick(artist.id)}
                        >
                          <div className="w-full aspect-square rounded-full bg-muted mb-3 overflow-hidden">
                            {artist.image?.[2]?.url ? (
                              <img
                                src={artist.image[2].url}
                                alt={artist.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                <Play className="w-8 h-8 text-white/70" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium truncate">
                            {decodeHtmlEntities(artist.title)}
                          </p>
                          <p className="text-sm text-muted-foreground">Artist</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No artists found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Playlists Tab */}
                <TabsContent value="playlists">
                  {searchResults.playlists?.results?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {searchResults.playlists.results.map((playlist, index) => (
                        <div
                          key={playlist.id || index}
                          className="group cursor-pointer"
                          onClick={() => handlePlaylistClick(playlist.id)}
                        >
                          <div className="w-full aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                            {playlist.image?.[2]?.url ? (
                              <img
                                src={playlist.image[2].url}
                                alt={playlist.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                <Play className="w-8 h-8 text-white/70" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium truncate text-sm">
                            {decodeHtmlEntities(playlist.title)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            By {playlist.subtitle || 'Various Artists'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No playlists found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!searchQuery && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Search for music</h3>
              <p className="text-muted-foreground text-center">
                Find your favorite songs, albums, artists, and playlists
              </p>
            </div>
          )}

          {searchQuery && searchResults && !loading && (
            !searchResults.songs?.results?.length &&
            !searchResults.albums?.results?.length &&
            !searchResults.artists?.results?.length &&
            !searchResults.playlists?.results?.length && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </div>
            )
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}