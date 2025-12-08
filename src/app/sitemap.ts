// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://jammify-music.vercel.app";

  return [
    // Home
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },

    // Authentication
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/forgot-password`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/reset-password`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/verify-email`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },

    // Music Main
    { url: `${base}/music`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/music/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/music/favorites`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },

    // Discover
    { url: `${base}/music/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/music/discover/genres`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/music/discover/new-releases`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/music/discover/playlists`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/music/discover/top-hits`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/music/discover/english-top`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/music/discover/top-charts`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/music/discover/podcasts`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },

    // Library
    { url: `${base}/music/library`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/music/library/albums`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/music/library/artists`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/music/library/playlists`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/music/library/recently-played`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
  ];
}
