"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Play, ArrowLeft } from "lucide-react";

function EnglishTopPage() {
    const router = useRouter();
    const [englishTop, setEnglishTop] = useState([]);
    const [displayedHits, setDisplayedHits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const ITEMS_PER_BATCH = 24;

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        if (displayedHits.length > 0) {
            sessionStorage.setItem('englishTopDisplayedHits', JSON.stringify(displayedHits));
            sessionStorage.setItem('englishTopCurrentIndex', currentIndex.toString());
            sessionStorage.setItem('englishTopHasMore', hasMore.toString());
        }
    }, [displayedHits, currentIndex, hasMore]);

    // Restore scroll position after content loads
    useEffect(() => {
        if (!loading && displayedHits.length > 0) {
            const savedScrollPosition = sessionStorage.getItem('englishTopScrollPosition');
            if (savedScrollPosition) {
                const targetScrollPosition = parseInt(savedScrollPosition);
                let hasUserScrolled = false;
                let restorationTimeouts = [];
                
                // Track if user starts scrolling manually
                const handleUserScroll = () => {
                    hasUserScrolled = true;
                    // Clear all pending restoration attempts
                    restorationTimeouts.forEach(timeout => clearTimeout(timeout));
                    // Remove the scroll listener
                    window.removeEventListener('scroll', handleUserScroll);
                    // Clear the saved position so it doesn't interfere
                    sessionStorage.removeItem('englishTopScrollPosition');
                };
                
                const restoreScroll = () => {
                    if (!hasUserScrolled) {
                        window.scrollTo(0, targetScrollPosition);
                    }
                };

                // Add scroll listener to detect manual scrolling
                window.addEventListener('scroll', handleUserScroll);
                
                // Multiple restoration attempts (but they'll be cancelled if user scrolls)
                restorationTimeouts.push(setTimeout(restoreScroll, 100));
                restorationTimeouts.push(setTimeout(restoreScroll, 500));
                restorationTimeouts.push(setTimeout(restoreScroll, 1000));
                
                // Clean up after final attempt
                restorationTimeouts.push(setTimeout(() => {
                    window.removeEventListener('scroll', handleUserScroll);
                    sessionStorage.removeItem('englishTopScrollPosition');
                }, 1500));
            }
        }
    }, [loading, displayedHits.length]);

    // Load more items function
    const loadMoreItems = () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        const nextIndex = currentIndex + ITEMS_PER_BATCH;
        const nextBatch = englishTop.slice(currentIndex, nextIndex);
        
        setTimeout(() => {
            setDisplayedHits(prev => [...prev, ...nextBatch]);
            setCurrentIndex(nextIndex);
            setHasMore(nextIndex < englishTop.length);
            setLoadingMore(false);
        }, 300);
    };

    // Scroll event handler
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
                loadMoreItems();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentIndex, englishTop.length, loadingMore, hasMore]);

    useEffect(() => {
        const fetchAllEnglishTop = async () => {
            try {
                setLoading(true);

                // Check for saved state first
                const savedDisplayedHits = sessionStorage.getItem('englishTopDisplayedHits');
                const savedCurrentIndex = sessionStorage.getItem('englishTopCurrentIndex');
                const savedHasMore = sessionStorage.getItem('englishTopHasMore');
                const savedAllData = sessionStorage.getItem('englishTopAllData');

                // If we have saved data, restore it
                if (savedDisplayedHits && savedCurrentIndex && savedAllData) {
                    try {
                        const parsedDisplayedHits = JSON.parse(savedDisplayedHits);
                        const parsedAllData = JSON.parse(savedAllData);
                        
                        setEnglishTop(parsedAllData);
                        setDisplayedHits(parsedDisplayedHits);
                        setCurrentIndex(parseInt(savedCurrentIndex));
                        setHasMore(savedHasMore === 'true');
                        setLoading(false);
                        return;
                    } catch (error) {
                        console.error('Error restoring saved state:', error);
                        // Continue with fresh fetch if restoration fails
                    }
                }

                // Fresh fetch if no saved data
                const initialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=english%20top&page=0&limit=1`);
                const initialData = await initialResponse.json();

                if (initialData.success && initialData.data.total) {
                    const total = initialData.data.total;
                    const limit = 40;
                    const totalPages = Math.ceil(total / limit);

                    let allPlaylists = [];

                    // Fetch all pages concurrently
                    const promises = [];
                    for (let page = 0; page < totalPages; page++) {
                        promises.push(
                            fetch(`${process.env.NEXT_PUBLIC_API_URL}/search/playlists?query=english%20top&page=${page}&limit=${limit}`)
                                .then(response => response.json())
                        );
                    }

                    const responses = await Promise.all(promises);

                    // Combine all results
                    responses.forEach(data => {
                        if (data.success && data.data.results) {
                            allPlaylists = [...allPlaylists, ...data.data.results];
                        }
                    });

                    // Remove duplicates based on playlist id
                    const uniquePlaylists = allPlaylists.filter((playlist, index, self) =>
                        index === self.findIndex(p => p.id === playlist.id)
                    );

                    setEnglishTop(uniquePlaylists);
                    
                    // Save all data for future use
                    sessionStorage.setItem('englishTopAllData', JSON.stringify(uniquePlaylists));
                    
                    // Set initial batch for fresh visits
                    const initialBatch = uniquePlaylists.slice(0, ITEMS_PER_BATCH);
                    setDisplayedHits(initialBatch);
                    setCurrentIndex(ITEMS_PER_BATCH);
                    setHasMore(ITEMS_PER_BATCH < uniquePlaylists.length);
                }
            } catch (error) {
                console.error('Error fetching english top playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllEnglishTop();
    }, []);

    const handlePlayClick = (item, type) => {
        setCurrentlyPlaying({ item, type });
        console.log(`Playing ${type}:`, item);
    };

    const handleCardClick = (playlist) => {
        // Save scroll position before navigating
        sessionStorage.setItem('englishTopScrollPosition', window.scrollY.toString());
        
        // Navigate to playlist detail page with songCount as query parameter
        router.push(`/music/playlist/${playlist.id}?songCount=${playlist.songCount || 50}`);
    };

    const handleGoBack = () => {
        router.back();
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleGoBack}
                            className="mr-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music">
                                        Music
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music/discover">
                                        Discover
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>English Top</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">English Top Playlists</h1>
                            <p className="text-muted-foreground">
                                Discover the best English music playlists across decades and genres
                            </p>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                {Array.from({ length: 24 }).map((_, index) => (
                                    <div key={index} className="space-y-3">
                                        <div className="bg-gray-300 animate-pulse rounded-lg aspect-square" />
                                        <div className="bg-gray-300 animate-pulse h-4 rounded" />
                                        <div className="bg-gray-300 animate-pulse h-3 rounded w-2/3" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                    {displayedHits.map((playlist) => (
                                        <div
                                            key={playlist.id}
                                            className="group cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => handleCardClick(playlist)}
                                        >
                                            <div className="relative rounded-lg aspect-square overflow-hidden mb-3 bg-gradient-to-br from-green-500 to-emerald-600">
                                                {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                                                    <img
                                                        src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                                                        alt={playlist.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            console.log('Image failed to load:', e.target.src);
                                                            e.target.style.display = 'none';
                                                            // Show the gradient background instead
                                                        }}
                                                        onLoad={() => {
                                                            console.log('Image loaded successfully');
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white">
                                                        <Play className="w-12 h-12 opacity-50" />
                                                    </div>
                                                )}
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

                                {/* Loading more indicator */}
                                {loadingMore && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mt-6">
                                        {Array.from({ length: 12 }).map((_, index) => (
                                            <div key={`loading-${index}`} className="space-y-3">
                                                <div className="bg-gray-300 animate-pulse rounded-lg aspect-square" />
                                                <div className="bg-gray-300 animate-pulse h-4 rounded" />
                                                <div className="bg-gray-300 animate-pulse h-3 rounded w-2/3" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Load more button (optional manual trigger) */}
                                {!loadingMore && hasMore && (
                                    <div className="text-center mt-8">
                                        <Button
                                            onClick={loadMoreItems}
                                            variant="outline"
                                            size="lg"
                                        >
                                            Load More Playlists
                                        </Button>
                                    </div>
                                )}

                                {/* End of results indicator */}
                                {!hasMore && displayedHits.length > 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            You've reached the end! Showing all {displayedHits.length} playlists.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {!loading && displayedHits.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No English top playlists found</p>
                            </div>
                        )}

                        {/* Bottom padding to prevent content being hidden behind music player */}
                        <div className="pb-24" />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default EnglishTopPage;