"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(() => import('./map-component'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        <p>Loading map...</p>
      </div>
    </div>
  )
});

export default function RadioMap({ stations, onStationClick, currentStation }) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <DynamicMap 
        stations={stations}
        onStationClick={onStationClick}
        currentStation={currentStation}
      />
    </div>
  );
}