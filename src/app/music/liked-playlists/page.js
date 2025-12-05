"use client";

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
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Heart, MoreHorizontal, List } from "lucide-react";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";

export default function LikedPlaylistsPage() {
    const router = useRouter();

    // Initialize liked playlists hook
    const { likedPlaylists, loading, toggleLike, getLikedCount } = useLikedPlaylists('shree jaybhay');

    const handleGoBack = () => {
        router.back();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        </div>
                    </header>
                    <div className="flex-1 p-6">
                        <div className="animate-pulse space-y-6">
                            <div className="flex gap-6">
                                <div className="w-60 h-60 bg-gray-300 rounded-lg" />
                                <div className="flex-1 space-y-4">
                                    <div className="h-8 bg-gray-300 rounded w-1/3" />
                                    <div className="h-12 bg-gray-300 rounded w-2/3" />
                                    <div className="h-4 bg-gray-300 rounded w-1/4" />
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
                <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Liked Playlists</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    {/* Liked Playlists Header */}
                    <div className="p-6 text-white bg-gradient-to-br from-blue-600 to-blue-800">
                        <div className="flex gap-6 items-end">
                            <div className="w-60 h-60 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 shrink-0 shadow-2xl flex items-center justify-center">
                                <List className="w-20 h-20 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Badge variant="secondary" className="mb-2">
                                    Collection
                                </Badge>
                                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                                    Liked Playlists
                                </h1>
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                    <span className="font-semibold">shree jaybhay</span>
                                    <span>•</span>
                                    <span>{getLikedCount()} playlists</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Playlists Grid */}
                    <div className="p-6">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <div key={index} className="space-y-3">
                                        <div className="aspect-square bg-gray-300 animate-pulse rounded-lg" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-300 animate-pulse rounded w-3/4" />
                                            <div className="h-3 bg-gray-300 animate-pulse rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : likedPlaylists.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {likedPlaylists.map((playlist) => (
                                    <div
                                        key={playlist.playlistId}
                                        className="group cursor-pointer p-4 rounded-lg hover:bg-muted/50 transition-colors"
                                        onClick={() => router.push(`/music/playlist/${playlist.playlistId}?songCount=${playlist.songCount || 50}`)}
                                    >
                                        <div className="relative mb-4">
                                            <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                                                {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                                                    <img
                                                        src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                                                        alt={playlist.playlistName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <List className="w-12 h-12 opacity-50 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Play button overlay */}
                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    className="rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle play functionality here
                                                        console.log('Playing playlist:', playlist.playlistName);
                                                    }}
                                                >
                                                    <Play className="w-5 h-5 ml-0.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-semibold truncate text-sm">
                                                {decodeHtmlEntities(playlist.playlistName)}
                                            </h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {playlist.songCount} songs • Liked {formatDate(playlist.likedAt)}
                                            </p>
                                        </div>

                                        {/* Unlike button */}
                                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 p-1 h-8 w-8"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const result = await toggleLike({
                                                        id: playlist.playlistId,
                                                        name: playlist.playlistName,
                                                        description: playlist.description,
                                                        image: playlist.image,
                                                        songCount: playlist.songCount
                                                    });
                                                    console.log(result.message);
                                                }}
                                            >
                                                <Heart className="w-4 h-4 fill-current" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <List className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-xl font-semibold mb-2">No liked playlists yet</h3>
                                <p className="text-muted-foreground mb-4">Playlists you like will appear here</p>
                                <Button onClick={() => router.push('/music')}>
                                    Discover playlists
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}