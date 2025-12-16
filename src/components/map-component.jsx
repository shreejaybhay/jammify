"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Play, MapPin, ExternalLink, Volume2, Radio } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Import Leaflet only on client side
let L;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  
  // Fix for default markers in react-leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Custom marker icons
const createCustomIcon = (isActive = false) => {
  if (!L) return null;
  
  return L.divIcon({
    className: 'custom-radio-marker',
    html: `
      <div style="position: relative;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${isActive ? '#10b981' : '#3b82f6'}; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
          <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </div>
        ${isActive ? '<div style="position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background-color: #34d399; border-radius: 50%; animation: pulse 2s infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle theme-based tile layer switching
function ThemeHandler() {
  const map = useMap();
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tileLayerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !map || !L) return;

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const isDark = currentTheme === 'dark';

    // Remove current tile layer if it exists
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    // Add appropriate tile layer based on theme
    const tileLayer = L.tileLayer(
      isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    );

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Cleanup function
    return () => {
      if (tileLayerRef.current && map.hasLayer(tileLayerRef.current)) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [map, theme, systemTheme, mounted]);

  return null;
}

// Simple component to set map bounds
function MapBounds() {
  const map = useMap();

  useEffect(() => {
    // Set bounds to prevent world wrapping
    map.setMaxBounds([[-85, -180], [85, 180]]);
    map.options.maxBoundsViscosity = 1.0;
  }, [map]);

  return null;
}

// Component to handle map clustering and performance
function StationMarkers({ stations, onStationClick, currentStation }) {
  const map = useMap();
  const [visibleStations, setVisibleStations] = useState([]);

  useEffect(() => {
    const updateVisibleStations = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      // Limit number of stations based on zoom level
      let maxStations = zoom > 10 ? 200 : zoom > 6 ? 100 : 50;
      
      const filtered = stations
        .filter(station => {
          const lat = parseFloat(station.geo_lat);
          const lng = parseFloat(station.geo_long);
          return bounds.contains([lat, lng]);
        })
        .slice(0, maxStations);
      
      setVisibleStations(filtered);
    };

    updateVisibleStations();
    
    map.on('moveend', updateVisibleStations);
    map.on('zoomend', updateVisibleStations);

    return () => {
      map.off('moveend', updateVisibleStations);
      map.off('zoomend', updateVisibleStations);
    };
  }, [map, stations]);

  return (
    <>
      {visibleStations.map((station) => {
        const lat = parseFloat(station.geo_lat);
        const lng = parseFloat(station.geo_long);
        const isActive = currentStation?.stationuuid === station.stationuuid;

        if (isNaN(lat) || isNaN(lng)) return null;

        const customIcon = createCustomIcon(isActive);
        if (!customIcon) return null;

        return (
          <Marker
            key={station.stationuuid}
            position={[lat, lng]}
            icon={customIcon}
          >
            <Popup className="radio-popup" maxWidth={320}>
              <Card className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg leading-tight mb-1">
                        {station.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {station.country}{station.state && `, ${station.state}`}
                        </span>
                      </div>
                    </div>
                    {station.favicon && (
                      <div className="w-12 h-12 rounded-lg border bg-muted overflow-hidden flex-shrink-0">
                        <img
                          src={station.favicon}
                          alt={station.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Tags */}
                  {station.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {station.tags.split(',').slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs px-2 py-1 font-medium"
                        >
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-medium">{station.codec}</span>
                        <span>•</span>
                        <span className="font-medium">{station.bitrate}kbps</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Volume2 className="w-4 h-4" />
                      <span className="font-medium">{station.clickcount}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onStationClick(station)}
                      className="flex-1 h-10"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Station
                    </Button>
                    {station.homepage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(station.homepage, '_blank')}
                        className="h-10 px-3"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function MapComponent({ stations, onStationClick, currentStation }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        minZoom={2}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
        className="radio-map"
      >
        <ThemeHandler />
        <MapBounds />
        <StationMarkers 
          stations={stations || []} 
          onStationClick={onStationClick}
          currentStation={currentStation}
        />
      </MapContainer>
      
      <style jsx global>{`
        /* Essential Leaflet CSS */
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          position: relative !important;
          outline: 0 !important;
          background: #f8f9fa !important;
          z-index: 1 !important;
        }
        
        .leaflet-tile-pane {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
        }
        
        .leaflet-tile {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 256px !important;
          height: 256px !important;
          border: 0 !important;
          opacity: 1 !important;
        }
        
        .leaflet-tile-loaded {
          opacity: 1 !important;
        }
        
        .radio-map {
          position: relative !important;
          height: 100% !important;
          width: 100% !important;
          z-index: 1 !important;
        }
        
        /* Ensure dropdowns and modals appear above the map */
        [data-radix-popper-content-wrapper],
        [data-radix-select-content],
        [data-radix-dropdown-menu-content],
        .dropdown-content,
        .select-content,
        .popover-content {
          z-index: 9999 !important;
        }
        
        .custom-radio-marker {
          background: transparent !important;
          border: none !important;
        }
        
        /* Modern popup styling */
        .leaflet-popup-content-wrapper {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05) !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        
        .leaflet-popup-tip {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          box-shadow: 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          width: auto !important;
          min-width: 300px !important;
        }
        
        .leaflet-control-zoom {
          border: none;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        
        .leaflet-control-zoom a {
          border: none;
          background: white;
          color: #333;
        }
        
        .leaflet-control-zoom a:hover {
          background: #f0f0f0;
        }
        
        .leaflet-popup-content {
          margin: 0;
          padding: 0;
        }
        
        .leaflet-popup-close-button {
          color: hsl(var(--muted-foreground)) !important;
          font-size: 20px !important;
          padding: 8px !important;
          width: 32px !important;
          height: 32px !important;
          text-align: center !important;
          line-height: 1 !important;
          border-radius: 6px !important;
          background: transparent !important;
          border: none !important;
          right: 8px !important;
          top: 8px !important;
          font-weight: 400 !important;
        }
        
        .leaflet-popup-close-button:hover {
          color: hsl(var(--foreground)) !important;
          background: hsl(var(--muted)) !important;
        }
        
        /* Override all default popup text styling */
        .leaflet-popup-content * {
          color: inherit !important;
          font-family: inherit !important;
        }
        
        /* Ensure proper theme colors */
        .radio-popup .leaflet-popup-content-wrapper {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Hide the attribution control */
        .leaflet-control-attribution {
          display: none !important;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}