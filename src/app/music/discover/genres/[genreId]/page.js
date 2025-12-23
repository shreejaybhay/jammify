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
import { Play, ArrowLeft, Heart, Music, ListMusic, MoreVertical, Plus, User, Disc, Share, Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { genres } from "@/data/genres";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";

export default function GenreDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    const genreId = params.genreId;

    const [songs, setSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('songs');
    const [songsPage, setSongsPage] = useState(1); // Track current page for songs
    const [playlistsPage, setPlaylistsPage] = useState(1); // Track current page for playlists
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);
    const [hasMorePlaylists, setHasMorePlaylists] = useState(true);
    const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);

    // Find the current genre
    const currentGenre = genres.find(g => g.id === genreId);
    const genreName = currentGenre?.name || genreId;

    // Initialize hooks
    const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
    const { playSong, currentSong, isPlaying } = useMusicPlayer();

    useEffect(() => {
        const fetchGenreContent = async () => {
            if (!genreId) return;

            try {
                setLoading(true);

                // Fetch multiple pages of songs using seed queries for better relevance
                const fetchSongs = async () => {
                    const allSongs = [];
                    const seenIds = new Set(); // Track seen song IDs to prevent duplicates
                    const seenSongs = new Set(); // Track seen song name + artist combinations
                    const seedQueries = currentGenre?.seedQueries || [genreName];

                    // Helper function to create a unique key for song + artist combination
                    const createSongKey = (song) => {
                        const songName = song.name?.toLowerCase().trim() || '';
                        const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                            song.primaryArtists?.toLowerCase().trim() || '';
                        return `${songName}|${artistName}`;
                    };

                    // Use multiple seed queries to get diverse, relevant results
                    for (const query of seedQueries.slice(0, 3)) { // Use first 3 seed queries
                        try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=40&page=1`);
                            const data = await response.json();

                            if (data.success && data.data?.results && data.data.results.length > 0) {
                                // Filter out duplicates as we add them
                                const newSongs = data.data.results.filter(song => {
                                    // Skip if already seen by ID
                                    if (seenIds.has(song.id)) {
                                        return false;
                                    }

                                    // Skip if same song name + artist combination already exists
                                    const songKey = createSongKey(song);
                                    if (seenSongs.has(songKey)) {
                                        return false;
                                    }

                                    seenIds.add(song.id);
                                    seenSongs.add(songKey);
                                    return true;
                                });
                                allSongs.push(...newSongs);
                            }
                        } catch (error) {
                            console.error(`Error fetching songs for query "${query}":`, error);
                        }
                    }

                    return allSongs;
                };

                // Fetch multiple pages of playlists using seed queries for better relevance
                const fetchPlaylists = async () => {
                    const allPlaylists = [];
                    const seenIds = new Set(); // Track seen playlist IDs to prevent duplicates
                    const seedQueries = currentGenre?.seedQueries || [genreName];

                    // Use multiple seed queries to get diverse, relevant results
                    for (const query of seedQueries.slice(0, 2)) { // Use first 2 seed queries for playlists
                        try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&limit=40&page=1`);
                            const data = await response.json();

                            if (data.success && data.data?.results && data.data.results.length > 0) {
                                // Filter out duplicates as we add them
                                const newPlaylists = data.data.results.filter(playlist => {
                                    if (seenIds.has(playlist.id)) {
                                        return false; // Skip duplicate
                                    }
                                    seenIds.add(playlist.id);
                                    return true;
                                });
                                allPlaylists.push(...newPlaylists);
                            }
                        } catch (error) {
                            console.error(`Error fetching playlists for query "${query}":`, error);
                        }
                    }

                    return allPlaylists;
                };

                // Fetch both songs and playlists concurrently
                const [songsResults, playlistsResults] = await Promise.all([
                    fetchSongs(),
                    fetchPlaylists()
                ]);

                // No need for additional deduplication since it's already handled in fetch functions
                setSongs(songsResults);
                setPlaylists(playlistsResults);

            } catch (error) {
                console.error('Error fetching genre content:', error);
            } finally {
                setLoading(false);
                setHasLoaded(true);
            }
        };

        fetchGenreContent();
    }, [genreId, genreName]);

    const handleGoBack = () => {
        router.back();
    };

    const handleSongClick = (song, index) => {
        playSong(song, songs);
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

    // Load more songs function using seed queries
    const loadMoreSongs = async () => {
        if (loadingMore || !hasMoreSongs) return;

        try {
            setLoadingMore(true);
            const seedQueries = currentGenre?.seedQueries || [genreName];
            const allNewSongs = [];
            const seenIds = new Set(); // Track seen song IDs to prevent duplicates within load more
            const seenSongs = new Set(); // Track seen song name + artist combinations

            // Also track existing song IDs and song combinations to prevent duplicates with current songs
            const existingIds = new Set(songs.map(song => song.id));
            const existingSongs = new Set(songs.map(song => {
                const songName = song.name?.toLowerCase().trim() || '';
                const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                    song.primaryArtists?.toLowerCase().trim() || '';
                return `${songName}|${artistName}`;
            }));

            // Helper function to create a unique key for song + artist combination
            const createSongKey = (song) => {
                const songName = song.name?.toLowerCase().trim() || '';
                const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                    song.primaryArtists?.toLowerCase().trim() || '';
                return `${songName}|${artistName}`;
            };

            // Aggressive strategy to find new content - try multiple approaches
            let attempts = 0;
            const maxAttempts = 5;

            while (allNewSongs.length < 5 && attempts < maxAttempts) {
                attempts++;
                const currentPage = songsPage + attempts;

                // Strategy 1: Try different seed queries with higher pages
                for (const query of seedQueries.slice(0, Math.min(3, seedQueries.length))) {
                    if (allNewSongs.length >= 20) break; // Stop if we have enough songs

                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=30&page=${currentPage}`);
                        const data = await response.json();

                        if (data.success && data.data?.results && data.data.results.length > 0) {
                            // Filter out duplicates as we add them
                            const newSongs = data.data.results.filter(song => {
                                // Skip if already exists in current songs by ID
                                if (existingIds.has(song.id) || seenIds.has(song.id)) {
                                    return false;
                                }

                                // Skip if same song name + artist combination already exists
                                const songKey = createSongKey(song);
                                if (existingSongs.has(songKey) || seenSongs.has(songKey)) {
                                    return false;
                                }

                                seenIds.add(song.id);
                                seenSongs.add(songKey);
                                return true;
                            });
                            allNewSongs.push(...newSongs);
                        }
                    } catch (error) {
                        console.error(`Error loading more songs for query "${query}" page ${currentPage}:`, error);
                    }
                }

                // If we still don't have enough songs, try with less strict deduplication
                if (allNewSongs.length < 3 && attempts >= 3) {
                    console.log(`Trying less strict deduplication for genre ${genreName}`);
                    // Try with only ID-based deduplication (allow different versions of same song)
                    for (const query of seedQueries.slice(0, 2)) {
                        try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=25&page=${currentPage + 2}`);
                            const data = await response.json();

                            if (data.success && data.data?.results && data.data.results.length > 0) {
                                // Only filter by ID, not by song name + artist
                                const newSongs = data.data.results.filter(song => {
                                    if (existingIds.has(song.id) || seenIds.has(song.id)) {
                                        return false;
                                    }
                                    seenIds.add(song.id);
                                    return true;
                                });
                                allNewSongs.push(...newSongs);
                            }
                        } catch (error) {
                            console.error(`Error with less strict deduplication for query "${query}":`, error);
                        }
                    }
                }
            }

            if (allNewSongs.length > 0) {
                setSongs(prevSongs => [...prevSongs, ...allNewSongs]);
                setSongsPage(prev => prev + 1);
            } else {
                setHasMoreSongs(false);
            }
        } catch (error) {
            console.error('Error loading more songs:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Load more playlists function using seed queries
    const loadMorePlaylists = async () => {
        if (loadingMore || !hasMorePlaylists) return;

        try {
            setLoadingMore(true);
            const seedQueries = currentGenre?.seedQueries || [genreName];
            const allNewPlaylists = [];
            const seenIds = new Set(); // Track seen playlist IDs to prevent duplicates within load more

            // Also track existing playlist IDs to prevent duplicates with current playlists
            const existingIds = new Set(playlists.map(playlist => playlist.id));

            // Aggressive strategy to find new playlists - try multiple approaches
            let attempts = 0;
            const maxAttempts = 4;

            while (allNewPlaylists.length < 3 && attempts < maxAttempts) {
                attempts++;
                const currentPage = playlistsPage + attempts;

                // Try different seed queries with higher pages
                for (const query of seedQueries.slice(0, Math.min(3, seedQueries.length))) {
                    if (allNewPlaylists.length >= 15) break; // Stop if we have enough playlists

                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&limit=25&page=${currentPage}`);
                        const data = await response.json();

                        if (data.success && data.data?.results && data.data.results.length > 0) {
                            // Filter out duplicates as we add them
                            const newPlaylists = data.data.results.filter(playlist => {
                                // Skip if already exists in current playlists or already seen in this load more
                                if (existingIds.has(playlist.id) || seenIds.has(playlist.id)) {
                                    return false;
                                }
                                seenIds.add(playlist.id);
                                return true;
                            });
                            allNewPlaylists.push(...newPlaylists);
                        }
                    } catch (error) {
                        console.error(`Error loading more playlists for query "${query}" page ${currentPage}:`, error);
                    }
                }
            }

            if (allNewPlaylists.length > 0) {
                setPlaylists(prevPlaylists => [...prevPlaylists, ...allNewPlaylists]);
                setPlaylistsPage(prev => prev + 1);
            } else {
                setHasMorePlaylists(false);
            }
        } catch (error) {
            console.error('Error loading more playlists:', error);
        } finally {
            setLoadingMore(false);
        }
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
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music/discover">Discover</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music/discover/genres">Genres</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{genreName}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    {/* Genre Header */}
                    <div className={`p-4 md:p-6 text-white bg-gradient-to-br ${currentGenre?.color || 'from-purple-500 to-pink-500'}`}>
                        <div className="flex items-end gap-6">
                            <div className="flex-1">
                                <Badge variant="secondary" className="mb-2">
                                    Genre
                                </Badge>
                                <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4">
                                    {genreName}
                                </h1>
                                <p className="text-sm md:text-lg opacity-90">
                                    Discover the best {genreName.toLowerCase()} music
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b">
                        <div className="flex px-3 md:px-6">
                            <button
                                className={`px-3 md:px-4 py-3 font-medium border-b-2 transition-colors text-sm md:text-base ${activeTab === 'songs'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setActiveTab('songs')}
                            >
                                Songs ({songs.length})
                            </button>
                            <button
                                className={`px-3 md:px-4 py-3 font-medium border-b-2 transition-colors text-sm md:text-base ${activeTab === 'playlists'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setActiveTab('playlists')}
                            >
                                Playlists ({playlists.length})
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-3 md:px-6 pb-24">
                        {activeTab === 'songs' && (
                            <div className="py-4 md:py-6">
                                {hasLoaded && songs.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No songs found</h3>
                                        <p className="text-muted-foreground">
                                            Try exploring other genres
                                        </p>
                                    </div>
                                ) : songs.length > 0 ? (
                                    <>
                                        <div className="space-y-1">
                                            {songs.map((song, index) => {
                                                const isCurrentSong = currentSong?.id === song.id;
                                                return (
                                                    <div key={song.id || index}>
                                                        {/* Mobile Layout */}
                                                        <div
                                                            className={`md:hidden flex items-center gap-3 p-3 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                                                                }`}
                                                            onClick={() => handleSongClick(song, index)}
                                                        >
                                                            <div className="w-6 text-center flex-shrink-0">
                                                                {isCurrentSong ? (
                                                                    <div className="flex items-center justify-center">
                                                                        <div className={`w-4 h-4 flex items-center justify-center ${isPlaying ? 'text-green-500' : 'text-muted-foreground'
                                                                            }`}>
                                                                            {isPlaying ? (
                                                                                <div className="flex gap-0.5">
                                                                                    <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                                                                                    <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                                                                    <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                                                </div>
                                                                            ) : (
                                                                                <Play className="w-4 h-4" />
                                                                            )}
                                                                        </div>
                                                                    </div>
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
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Music className="w-4 h-4 opacity-50 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                                                                    }`}>
                                                                    {decodeHtmlEntities(song.name)}
                                                                </p>
                                                                <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                                                    }`}>
                                                                    {song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
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
                                                                        <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, song)}>
                                                                            <Disc className="w-4 h-4 mr-2" />
                                                                            Go to album
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={(e) => handleShare(e, song)}>
                                                                            <Share className="w-4 h-4 mr-2" />
                                                                            Share
                                                                        </DropdownMenuItem>
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
                                                            onClick={() => handleSongClick(song, index)}
                                                        >
                                                            <div className="w-8 text-center">
                                                                {isCurrentSong ? (
                                                                    <div className="flex items-center justify-center">
                                                                        <div className={`w-4 h-4 flex items-center justify-center ${isPlaying ? 'text-green-500' : 'text-muted-foreground'
                                                                            }`}>
                                                                            {isPlaying ? (
                                                                                <div className="flex gap-0.5">
                                                                                    <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                                                                                    <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                                                                    <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                                                </div>
                                                                            ) : (
                                                                                <Play className="w-4 h-4" />
                                                                            )}
                                                                        </div>
                                                                    </div>
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
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <Music className="w-4 h-4 opacity-50 text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                                                                        }`}>
                                                                        {decodeHtmlEntities(song.name)}
                                                                    </p>
                                                                    <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                                                        }`}>
                                                                        {song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
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
                                                                        <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, song)}>
                                                                            <Disc className="w-4 h-4 mr-2" />
                                                                            Go to album
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={(e) => handleShare(e, song)}>
                                                                            <Share className="w-4 h-4 mr-2" />
                                                                            Share
                                                                        </DropdownMenuItem>
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

                                        {/* Load More Songs Button */}
                                        {hasMoreSongs && (
                                            <div className="flex justify-center mt-6 md:mt-8">
                                                <Button
                                                    variant="outline"
                                                    onClick={loadMoreSongs}
                                                    disabled={loadingMore}
                                                    className="px-6 md:px-8"
                                                >
                                                    {loadingMore ? 'Loading...' : 'Load More Songs'}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        )}

                        {activeTab === 'playlists' && (
                            <div className="py-4 md:py-6">
                                {hasLoaded && playlists.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ListMusic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No playlists found</h3>
                                        <p className="text-muted-foreground">
                                            Try exploring other genres
                                        </p>
                                    </div>
                                ) : playlists.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                                            {playlists.map((playlist) => (
                                                <div
                                                    key={playlist.id}
                                                    className="group cursor-pointer p-2 md:p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                                    onClick={() => handlePlaylistClick(playlist.id)}
                                                >
                                                    <div className="relative mb-2 md:mb-3">
                                                        <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                                                            {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                                                                <img
                                                                    src={playlist.image[2]?.url || playlist.image[1]?.url || playlist.image[0]?.url}
                                                                    alt={playlist.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <ListMusic className="w-8 h-8 md:w-12 md:h-12 opacity-50 text-white" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                                                            >
                                                                <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <h3 className="font-medium truncate text-sm md:text-base">
                                                            {decodeHtmlEntities(playlist.name)}
                                                        </h3>
                                                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                            {playlist.subtitle || 'Playlist'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Load More Playlists Button */}
                                        {hasMorePlaylists && (
                                            <div className="flex justify-center mt-6 md:mt-8">
                                                <Button
                                                    variant="outline"
                                                    onClick={loadMorePlaylists}
                                                    disabled={loadingMore}
                                                    className="px-6 md:px-8"
                                                >
                                                    {loadingMore ? 'Loading...' : 'Load More Playlists'}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : null}
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
        </SidebarProvider >
    );
}