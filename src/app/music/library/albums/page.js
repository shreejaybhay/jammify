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
import { Heart, Play, Disc, Calendar } from "lucide-react";
import { useLikedAlbums } from "@/hooks/useLikedAlbums";

export default function AlbumsPage() {
  const router = useRouter();
  const [likedAlbumsData, setLikedAlbumsData] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initialize liked albums hook
  const { toggleLike: toggleAlbumLike } = useLikedAlbums('shree jaybhay');

  useEffect(() => {
    const fetchLikedAlbums = async () => {
      try {
        const response = await fetch('/api/liked-albums?userId=shree jaybhay');
        const data = await response.json();

        if (data.success) {
          setLikedAlbumsData(data.data);
        }
      } catch (error) {
        console.error('Error fetching liked albums:', error);
      } finally {
        setHasLoaded(true);
      }
    };

    fetchLikedAlbums();
  }, []);

  const handleAlbumClick = (albumId) => {
    router.push(`/music/album/${albumId}`);
  };

  const handleUnlikeAlbum = async (album, e) => {
    e.stopPropagation();
    try {
      await toggleAlbumLike(album.albumData);
      // Refresh the list
      const response = await fetch('/api/liked-albums?userId=shree jaybhay');
      const data = await response.json();
      if (data.success) {
        setLikedAlbumsData(data.data);
      }
    } catch (error) {
      console.error('Error unliking album:', error);
    }
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/library">Your Library</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Albums</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Liked Albums</h1>
            <p className="text-muted-foreground">
              {likedAlbumsData.length} album{likedAlbumsData.length !== 1 ? 's' : ''}
            </p>
          </div>

          {hasLoaded && likedAlbumsData.length === 0 ? (
            <div className="text-center py-12">
              <Disc className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No liked albums yet</h3>
              <p className="text-muted-foreground mb-4">
                Albums you like will appear here
              </p>
              <Button onClick={() => router.push('/music/discover')}>
                Discover Music
              </Button>
            </div>
          ) : likedAlbumsData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {likedAlbumsData.map((album) => (
                <div
                  key={album.id}
                  className="group cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => handleAlbumClick(album.albumId)}
                >
                  <div className="relative mb-3">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                      {album.albumData?.image?.[2]?.url || album.albumData?.image?.[1]?.url || album.albumData?.image?.[0]?.url ? (
                        <img
                          src={album.albumData.image[2]?.url || album.albumData.image[1]?.url || album.albumData.image[0]?.url}
                          alt={album.albumData?.name || 'Album'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc className="w-12 h-12 opacity-50 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                      <Button
                        size="sm"
                        className="rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-black shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(album.albumId);
                        }}
                      >
                        <Play className="w-5 h-5 ml-0.5" />
                      </Button>
                    </div>

                    {/* Unlike button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 bg-black/50 hover:bg-black/70 text-red-500"
                      onClick={(e) => handleUnlikeAlbum(album, e)}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium truncate">
                      {decodeHtmlEntities(album.albumData?.name) || 'Unknown Album'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {album.albumData?.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {album.albumData?.year && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{album.albumData.year}</span>
                        </div>
                      )}
                      {album.albumData?.songCount && (
                        <>
                          <span>•</span>
                          <span>{album.albumData.songCount} songs</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}