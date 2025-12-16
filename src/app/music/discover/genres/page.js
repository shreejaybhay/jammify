"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Search, Music } from "lucide-react";
import { genres } from "@/data/genres";

export default function GenresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter genres based on search term
  const filteredGenres = useMemo(() => {
    if (!searchTerm.trim()) {
      return genres;
    }
    return genres.filter((genre) =>
      genre.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleGenreClick = (genreId) => {
    router.push(`/music/discover/genres/${genreId}`);
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
                  <BreadcrumbLink href="/music/discover">Discover</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Genres</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Browse Genres</h1>
            <p className="text-muted-foreground">
              Discover music by your favorite genres
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search genres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredGenres.length} genre{filteredGenres.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Genres Grid */}
          {filteredGenres.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
              {filteredGenres.map((genre) => (
                <div
                  key={genre.id}
                  className={`relative h-32 rounded-lg overflow-hidden cursor-pointer group transition-transform hover:scale-105 bg-gradient-to-br ${genre.color}`}
                  onClick={() => handleGenreClick(genre.id)}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="relative h-full flex items-end p-4">
                    <h3 className="text-white font-bold text-lg drop-shadow-lg">
                      {genre.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No genres found</h3>
              <p className="text-muted-foreground">
                Try searching for a different genre name
              </p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}