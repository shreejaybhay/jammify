"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Radio,
  Search,
  MapPin,
  Play,
  Pause,
  Volume2,
  Globe,
  Filter,
  Heart,
  ExternalLink,
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const RadioMap = dynamic(() => import("@/components/radio-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        <p>Loading radio stations map...</p>
      </div>
    </div>
  ),
});

export default function RadioPage() {
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [tags, setTags] = useState([]);
  const [currentStation, setCurrentStation] = useState(null);
  const [viewMode, setViewMode] = useState("map"); // "map" or "list"

  const { playSong, currentSong, isPlayerVisible, isPlaying } = useMusicPlayer();

  // Function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch stations with geo info
        const stationsResponse = await fetch(
          "https://de1.api.radio-browser.info/json/stations/search?limit=1000&has_geo_info=true&hidebroken=true&order=clickcount&reverse=true"
        );
        const stationsData = await stationsResponse.json();
        
        // Filter stations with valid coordinates
        const validStations = stationsData.filter(
          station => station.geo_lat && station.geo_long && 
          station.geo_lat !== 0 && station.geo_long !== 0 &&
          station.lastcheckok === 1
        );
        
        setStations(validStations);
        setFilteredStations(validStations);

        // Fetch countries
        const countriesResponse = await fetch(
          "https://de1.api.radio-browser.info/json/countries?hidebroken=true"
        );
        const countriesData = await countriesResponse.json();
        setCountries(countriesData.slice(0, 50)); // Limit to top 50 countries

        // Fetch languages
        const languagesResponse = await fetch(
          "https://de1.api.radio-browser.info/json/languages?hidebroken=true"
        );
        const languagesData = await languagesResponse.json();
        setLanguages(languagesData.slice(0, 30)); // Limit to top 30 languages

        // Fetch tags
        const tagsResponse = await fetch(
          "https://de1.api.radio-browser.info/json/tags?hidebroken=true"
        );
        const tagsData = await tagsResponse.json();
        setTags(tagsData.slice(0, 50)); // Limit to top 50 tags

      } catch (error) {
        console.error("Error fetching radio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Filter stations based on search criteria
  useEffect(() => {
    let filtered = stations;

    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.tags.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCountry && selectedCountry !== "all") {
      filtered = filtered.filter(station =>
        station.countrycode === selectedCountry
      );
    }

    if (selectedLanguage && selectedLanguage !== "all") {
      filtered = filtered.filter(station =>
        station.language.toLowerCase().includes(selectedLanguage.toLowerCase())
      );
    }

    if (selectedTag && selectedTag !== "all") {
      filtered = filtered.filter(station =>
        station.tags.toLowerCase().includes(selectedTag.toLowerCase())
      );
    }

    setFilteredStations(filtered);
  }, [searchTerm, selectedCountry, selectedLanguage, selectedTag, stations]);

  const handleStationPlay = async (station) => {
    try {
      // Click counter for the station and get the proper stream URL
      const clickResponse = await fetch(
        `https://de1.api.radio-browser.info/json/url/${station.stationuuid}`,
        {
          headers: {
            'User-Agent': 'Jammify/1.0'
          }
        }
      );
      const clickData = await clickResponse.json();
      
      // Use the URL from the click response or fallback to station URL
      const streamUrl = clickData.url || station.url_resolved || station.url;
      
      // Convert radio station to music player format
      const radioSong = {
        id: station.stationuuid,
        name: decodeHtmlEntities(station.name),
        artists: { primary: [{ name: station.country || "Radio Station" }] },
        album: { name: station.tags || "Live Radio" },
        duration: 0, // Live stream
        image: station.favicon ? [{ url: station.favicon, quality: "150x150" }] : [],
        downloadUrl: [
          { url: streamUrl, quality: "320kbps" },
          { url: streamUrl, quality: "stream" },
          { url: streamUrl, quality: "160kbps" },
          { url: streamUrl, quality: "128kbps" },
          { url: streamUrl, quality: "96kbps" }
        ],
        isRadio: true,
      };

      playSong(radioSong, [radioSong]);
      setCurrentStation(station);
      
      console.log("Playing radio station:", station.name, "URL:", streamUrl);
    } catch (error) {
      console.error("Error playing radio station:", error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Failed to play radio station. Please try another one.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedLanguage("all");
    setSelectedTag("all");
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Radio</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-48" />
              <div className="h-[600px] bg-muted rounded-lg" />
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
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-3 md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Radio</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6 pb-32 max-h-[calc(100vh-64px)] overflow-y-auto">


          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Radio className="w-8 h-8" />
                Radio Stations
              </h1>
              <p className="text-muted-foreground">
                Discover radio stations from around the world
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("map")}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <Radio className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter radio stations by location, language, or genre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          {country.name} ({country.stationcount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages</SelectItem>
                      {languages.map((language) => (
                        <SelectItem key={language.name} value={language.name}>
                          {language.name} ({language.stationcount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genres</SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag.name} value={tag.name}>
                          {tag.name} ({tag.stationcount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredStations.length} stations
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {viewMode === "map" ? (
            <Card className="mb-20">
              <CardContent className="p-0">
                <div className="h-[calc(100vh-360px)] min-h-[400px] max-h-[calc(100vh-360px)] overflow-hidden relative">
                  <RadioMap 
                    stations={filteredStations} 
                    onStationClick={handleStationPlay}
                    currentStation={currentStation}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStations.map((station) => (
                <Card key={station.stationuuid} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {station.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {station.country}
                          {station.state && `, ${station.state}`}
                        </CardDescription>
                      </div>
                      {station.favicon && (
                        <img
                          src={station.favicon}
                          alt={station.name}
                          className="w-8 h-8 rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {station.tags && (
                        <div className="flex flex-wrap gap-1">
                          {station.tags.split(',').slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{station.codec} • {station.bitrate}kbps</span>
                        <span>{station.clickcount} listeners</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStationPlay(station)}
                          className="flex-1"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </Button>
                        {station.homepage && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(station.homepage, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}