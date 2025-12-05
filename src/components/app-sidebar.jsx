"use client"

import * as React from "react"
import {
  AudioWaveform,
  Music,
  Heart,
  ListMusic,
  Radio,
  Search,
  Settings2,
  User,
  Home,
  TrendingUp,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Music app data
const data = {
  user: {
    name: "Music Lover",
    email: "user@jammify.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Jammify",
      logo: AudioWaveform,
      plan: "Premium",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/music",
      icon: Home,
      isActive: true,
    },
    {
      title: "Search",
      url: "/music/search",
      icon: Search,
    },
    {
      title: "Your Library",
      url: "/music/library",
      icon: ListMusic,
      items: [
        {
          title: "Recently Played",
          url: "/music/library/recently-played",
        },
        {
          title: "Liked Songs",
          url: "/music/favorites",
        },
        {
          title: "Albums",
          url: "/music/library/albums",
        },
        {
          title: "Playlists",
          url: "/music/library/playlists",
        },
        {
          title: "Artists",
          url: "/music/library/artists",
        },
      ],
    },
    {
      title: "Discover",
      url: "/music/discover",
      icon: TrendingUp,
      items: [
        {
          title: "New Releases",
          url: "/music/discover/new-releases",
        },
        {
          title: "Top Charts",
          url: "/music/discover/top-charts",
        },
        {
          title: "Genres",
          url: "/music/discover/genres",
        },
        {
          title: "Podcasts",
          url: "/music/discover/podcasts",
        },
      ],
    },
  ],
  projects: [
    {
      name: "My Playlists",
      url: "/music/playlists",
      icon: Music,
    },
    {
      name: "Favorites",
      url: "/music/favorites",
      icon: Heart,
    },
    {
      name: "Radio Stations",
      url: "/music/radio",
      icon: Radio,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
