"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Music, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function ArtistsPage() {
  const { data: session, status } = useSession();
  const [artistsWithData, setArtistsWithData] = useState([]);

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once when authenticated and not already initialized
    if (status === "authenticated" && session?.user?.email && !hasInitialized) {
      initializeArtistsPage();
    } else if (status === "unauthenticated") {
      setHasInitialized(false);
    }
  }, [session, status, hasInitialized]);

  const initializeArtistsPage = async () => {
    try {
      console.log('Initializing artists page for user:', session.user.email);

      // Step 1: Fetch liked artists list
      const response = await fetch(`/api/liked-artists?userId=${session.user.email}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to fetch liked artists:', data.error);
        setArtistsWithData([]);
        setHasInitialized(true);
        return;
      }

      console.log('Found liked artists:', data.data.length);

      if (data.data.length === 0) {
        setArtistsWithData([]);
        setHasInitialized(true);
        return;
      }

      // Step 2: Fetch all artist details in parallel
      console.log('Fetching detailed data for all artists...');
      const artistPromises = data.data.map(async (likedArtist) => {
        try {
          const artistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists?id=${likedArtist.artistId}`);

          if (!artistResponse.ok) {
            throw new Error(`HTTP error! status: ${artistResponse.status}`);
          }

          const artistData = await artistResponse.json();
          const actualArtistData = artistData.success ? artistData.data : artistData;

          return {
            ...likedArtist,
            artistData: actualArtistData
          };
        } catch (error) {
          console.error(`Error fetching artist ${likedArtist.artistId}:`, error);
          return {
            ...likedArtist,
            artistData: null
          };
        }
      });

      // Wait for all artist data to be fetched
      const artistsWithFullData = await Promise.all(artistPromises);

      console.log('All artist data loaded successfully');
      setArtistsWithData(artistsWithFullData);
      setHasInitialized(true);

    } catch (error) {
      console.error('Error initializing artists page:', error);
      setArtistsWithData([]);
      setHasInitialized(true); // Mark as initialized even on error to prevent retry loops
    }
  };

  const toggleLike = async (artistId) => {
    try {
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.email,
          artistId: artistId
        })
      });

      const data = await response.json();
      if (data.success) {
        // Instead of re-initializing, just remove the artist from the current list
        setArtistsWithData(prev => prev.filter(artist => artist.artistId !== artistId));
      }
    } catch (error) {
      console.error('Error toggling artist like:', error);
    }
  };



  // Show sign-in screen only when definitely not authenticated
  if (status === "unauthenticated") {
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
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music/library">Your Library</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Artists</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Sign in to view your favorite artists</h2>
            <p className="text-muted-foreground">Please sign in to see your liked artists.</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-3 md:px-4">
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
                  <BreadcrumbPage>Artists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-3 md:p-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Favorite Artists</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {artistsWithData.length} artist{artistsWithData.length !== 1 ? 's' : ''} in your library
            </p>
          </div>

          {artistsWithData.length === 0 && hasInitialized ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <Music className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No favorite artists yet</h2>
              <p className="text-muted-foreground mb-4 text-center">
                Start exploring music and like your favorite artists to see them here.
              </p>
              <Link href="/music/discover">
                <Button>Discover Music</Button>
              </Link>
            </div>
          ) : artistsWithData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {artistsWithData.map((artist) => {
                const artistData = artist.artistData;

                return (
                  <Link key={artist.artistId} href={`/music/artist/${artist.artistId}`} className="group cursor-pointer block">
                    <div className="relative aspect-square mb-2 md:mb-3 overflow-hidden rounded-xl bg-gradient-to-br from-muted/50 to-muted shadow-sm hover:shadow-md transition-all duration-200">
                      {artistData?.image?.length > 0 ? (
                        <Image
                          src={artistData.image.find(img => img.quality === "500x500")?.url ||
                            artistData.image.find(img => img.quality === "150x150")?.url ||
                            artistData.image[0]?.url}
                          alt={artistData.name || 'Artist'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 12.5vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                          <User className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/60" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-xl" />

                      {/* Unlike button - always visible on mobile, hover on desktop */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 md:top-3 md:right-3 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 h-6 w-6 md:h-8 md:w-8 p-0 bg-white/90 hover:bg-white shadow-sm border-0 z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLike(artist.artistId);
                        }}
                      >
                        <Heart className="h-3 w-3 md:h-3.5 md:w-3.5 fill-red-500 text-red-500" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-semibold text-xs md:text-sm truncate group-hover:text-primary transition-colors duration-200">
                        {artistData?.name || `Artist ${artist.artistId}`}
                      </h3>
                      <p className="text-xs text-muted-foreground/80 capitalize">
                        {artistData?.dominantType || artistData?.type || 'Artist'}
                      </p>
                      {artistData?.followerCount && (
                        <p className="text-xs text-muted-foreground/60">
                          {artistData.followerCount.toLocaleString()} followers
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}