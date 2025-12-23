"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  ArrowLeft,
  MoreVertical,
  Clock,
  Shuffle,
  Download,
  Share,
  ListMusic,
  Trash2,
  Lock,
  Unlock,
  Edit,
  Heart,
  Minus,
  User,
  Disc
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";

export default function PlaylistDetailPage({ params }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playlistId, setPlaylistId] = useState(null);
  const [dominantColors, setDominantColors] = useState(['#1a1a1a', '#2a2a2a']); // Default dark colors to prevent flash
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Initialize music player
  const { playSong, currentSong, isPlaying } = useMusicPlayer();

  // Function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Extract dominant colors from image and make them darker for ambient effect
  const extractColorsFromImage = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Sample colors from different areas
        const colorCounts = {};
        const sampleSize = 10; // Sample every 10th pixel for performance

        for (let i = 0; i < data.length; i += 4 * sampleSize) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          // Skip transparent pixels
          if (alpha < 128) continue;

          // Skip very light or very dark colors
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 225) continue;

          // Group similar colors
          const colorKey = `${Math.floor(r / 20) * 20},${Math.floor(g / 20) * 20},${Math.floor(b / 20) * 20}`;
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        }

        // Get most frequent colors and darken them significantly
        const sortedColors = Object.entries(colorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            // Darken colors significantly for ambient effect (multiply by 0.3-0.4)
            const darkenedR = Math.floor(r * 0.35);
            const darkenedG = Math.floor(g * 0.35);
            const darkenedB = Math.floor(b * 0.35);
            return `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
          });

        if (sortedColors.length >= 2) {
          // Convert to hex
          const colors = sortedColors.slice(0, 2).map(rgbColor => {
            const rgb = rgbColor.match(/\d+/g);
            const hex = rgb.map(x => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('');
            return `#${hex}`;
          });

          resolve(colors);
        } else {
          // Fallback to very dark colors
          resolve(['#1a1a1a', '#2a2a2a']);
        }
      };

      img.onerror = () => {
        resolve(['#1a1a1a', '#2a2a2a']); // Dark fallback
      };

      img.src = imageSrc;
    });
  };

  // Unwrap params Promise
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setPlaylistId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Check if playlist is liked by current user
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!playlistId || !session?.user?.id) return;

      try {
        const response = await fetch(`/api/playlists/${playlistId}/like`);
        const result = await response.json();

        if (result.success) {
          setIsLiked(result.isLiked);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();
  }, [playlistId, session?.user?.id]);

  // Fetch playlist data and songs
  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!playlistId) return;

      try {
        const response = await fetch(`/api/playlists/${playlistId}`);
        const result = await response.json();

        if (result.success) {
          setPlaylist(result.data);
          setIsOwner(result.data.isOwner || false);

          // Fetch actual song data using songIds
          if (result.data.songIds && result.data.songIds.length > 0) {
            await fetchSongs(result.data.songIds);
          } else {
            setSongs([]);
          }
        } else {
          // Handle privacy errors
          if (response.status === 403) {
            setAccessDenied(true);
          } else {
            console.error('Failed to fetch playlist:', result.error);
          }
        }
      } catch (error) {
        console.error('Error fetching playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSongs = async (songIds) => {
      try {
        console.log('Fetching songs for IDs:', songIds);

        // Fetch songs from JioSaavn API
        const songPromises = songIds.map(async (songId) => {
          try {
            console.log(`Fetching song: ${songId}`);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${songId}`);
            console.log(`Response status for ${songId}:`, response.status);

            const data = await response.json();
            console.log(`Response data for ${songId}:`, data);

            if (data.success && data.data && data.data.length > 0) {
              console.log(`Successfully fetched song: ${data.data[0].name}`);
              return data.data[0]; // Return the first song from the response
            }
            console.log(`No valid data for song ${songId}`);
            return null;
          } catch (error) {
            console.error(`Error fetching song ${songId}:`, error);
            return null;
          }
        });

        const fetchedSongs = await Promise.all(songPromises);
        console.log('All fetched songs:', fetchedSongs);

        // Filter out null values (failed requests)
        const validSongs = fetchedSongs.filter(song => song !== null);
        console.log('Valid songs:', validSongs);

        setSongs(validSongs);
      } catch (error) {
        console.error('Error fetching songs:', error);
        setSongs([]);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  // Generate playlist cover based on songs
  const getPlaylistCover = () => {
    if (!songs || songs.length === 0) {
      return { type: 'default', src: '/def playlist image.jpg' };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      // Use first song's cover image
      const firstSong = songs[0];
      const imageUrl = firstSong.image?.find(img => img.quality === '500x500')?.url ||
        firstSong.image?.find(img => img.quality === '150x150')?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: 'single',
        src: imageUrl || '/def playlist image.jpg',
        song: firstSong
      };
    }

    if (songs.length >= 4) {
      // Create 4-image collage from first 4 songs
      const firstFourSongs = songs.slice(0, 4);
      const images = firstFourSongs.map(song => {
        return song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.find(img => img.quality === '500x500')?.url ||
          song.image?.[song.image.length - 1]?.url ||
          '/def playlist image.jpg';
      });

      return {
        type: 'collage',
        images: images,
        songs: firstFourSongs
      };
    }

    return { type: 'default', src: '/def playlist image.jpg' };
  };

  // Extract colors from playlist image when playlist loads
  useEffect(() => {
    if (playlist && songs.length >= 0) {
      const extractColors = async () => {
        try {
          const cover = getPlaylistCover();
          let imageSrc = '/def playlist image.jpg';

          if (cover.type === 'single' && cover.src) {
            imageSrc = cover.src;
          } else if (cover.type === 'collage' && cover.images[0]) {
            // Use first image from collage for color extraction
            imageSrc = cover.images[0];
          }

          const colors = await extractColorsFromImage(imageSrc);
          setDominantColors(colors);
        } catch (error) {
          console.error('Error extracting colors:', error);
          // Keep default colors
        }
      };

      extractColors();
    }
  }, [playlist, songs]);

  const handlePlayClick = (song, index) => {
    const isCurrentSong = currentSong?.id === song.id;

    // If clicking on the currently playing song, do nothing
    if (isCurrentSong) {
      return;
    }

    // Convert JioSaavn song format to standard format for the player
    const songData = {
      id: song.id,
      name: song.name,
      artists: { primary: song.artists?.primary || [] },
      album: song.album,
      duration: song.duration,
      image: song.image,
      releaseDate: song.releaseDate,
      language: song.language,
      playCount: song.playCount,
      downloadUrl: song.downloadUrl
    };

    // Convert all playlist songs to standard format for playlist
    const playlistData = songs.map(playlistSong => ({
      id: playlistSong.id,
      name: playlistSong.name,
      artists: { primary: playlistSong.artists?.primary || [] },
      album: playlistSong.album,
      duration: playlistSong.duration,
      image: playlistSong.image,
      releaseDate: playlistSong.releaseDate,
      language: playlistSong.language,
      playCount: playlistSong.playCount,
      downloadUrl: playlistSong.downloadUrl
    }));

    playSong(songData, playlistData);
    setCurrentlyPlaying({ song, index });
    console.log(`Playing song from playlist:`, song);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      // Convert first song to standard format
      const firstSong = {
        id: songs[0].id,
        name: songs[0].name,
        artists: { primary: songs[0].artists?.primary || [] },
        album: songs[0].album,
        duration: songs[0].duration,
        image: songs[0].image,
        releaseDate: songs[0].releaseDate,
        language: songs[0].language,
        playCount: songs[0].playCount,
        downloadUrl: songs[0].downloadUrl
      };

      // Convert all playlist songs to standard format for playlist
      const playlistData = songs.map(playlistSong => ({
        id: playlistSong.id,
        name: playlistSong.name,
        artists: { primary: playlistSong.artists?.primary || [] },
        album: playlistSong.album,
        duration: playlistSong.duration,
        image: playlistSong.image,
        releaseDate: playlistSong.releaseDate,
        language: playlistSong.language,
        playCount: playlistSong.playCount,
        downloadUrl: playlistSong.downloadUrl
      }));

      playSong(firstSong, playlistData);
      setCurrentlyPlaying({ song: songs[0], index: 0 });
      console.log('Playing all songs from playlist starting with:', songs[0]);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleTogglePrivacy = async () => {
    // Optimistically update the UI immediately
    const previousState = playlist.isPublic;
    setPlaylist(prev => ({ ...prev, isPublic: !prev.isPublic }));

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !previousState
        }),
      });

      const result = await response.json();
      if (!result.success) {
        // Revert the optimistic update if the API call failed
        setPlaylist(prev => ({ ...prev, isPublic: previousState }));
        console.error('Failed to update playlist privacy:', result.error);

        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = 'Failed to update playlist privacy. Please try again.';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } catch (error) {
      // Revert the optimistic update if there was an error
      setPlaylist(prev => ({ ...prev, isPublic: previousState }));
      console.error('Error updating playlist privacy:', error);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Something went wrong. Please try again.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  const handleSharePlaylist = async () => {
    if (playlist.isPublic) {
      // Use NEXT_PUBLIC_APP_URL from environment variable
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const shareUrl = `${baseUrl}/music/playlists/${playlistId}`;

      try {
        // Try to use the Web Share API first (mobile devices)
        if (navigator.share) {
          await navigator.share({
            title: playlist.name,
            text: `Check out this playlist: ${playlist.name}`,
            url: shareUrl,
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareUrl);

          // Create a temporary toast notification
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
          toast.textContent = 'Playlist link copied to clipboard!';
          document.body.appendChild(toast);

          // Remove toast after 3 seconds
          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
              document.body.removeChild(toast);
            }, 300);
          }, 3000);
        }
      } catch (error) {
        console.error('Error sharing playlist:', error);

        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = 'Failed to share playlist. Please try again.';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } else {
      // Show toast that playlist needs to be public to share
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Make playlist public first to share it!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  const handleEditPlaylist = () => {
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      return; // Don't save if name is empty
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim()
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPlaylist(prev => ({
          ...prev,
          name: editName.trim(),
          description: editDescription.trim()
        }));
        setEditDialogOpen(false);
      } else {
        console.error('Failed to update playlist:', result.error);
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/music/playlists');
      } else {
        console.error('Failed to delete playlist:', result.error);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handleRemoveFromPlaylist = async (songId) => {
    if (!isOwner) {
      // Show toast that only owner can remove songs
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Only the playlist owner can remove songs!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove the song from the local state
        setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));

        // Update playlist songIds count
        setPlaylist(prev => ({
          ...prev,
          songIds: prev.songIds.filter(id => id !== songId)
        }));

        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = 'Song removed from playlist!';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      } else {
        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = result.error || 'Failed to remove song from playlist';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Something went wrong. Please try again.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  const handleToggleLike = async () => {
    if (!session?.user?.id) {
      // Show toast to login
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Please login to save playlists!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }

    if (isOwner) {
      // Show toast that you can't like your own playlist
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = "You can't save your own playlist!";
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }

    if (likingInProgress) return;

    setLikingInProgress(true);

    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: method,
      });

      const result = await response.json();

      if (result.success) {
        setIsLiked(!isLiked);

        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = isLiked
          ? 'Playlist removed from your library!'
          : 'Playlist saved to your library!';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      } else {
        // Show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = result.error || 'Failed to update playlist';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Error toggling like:', error);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Something went wrong. Please try again.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    } finally {
      setLikingInProgress(false);
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShareSong = async (song) => {
    // Share the current playlist URL instead of the individual song
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const shareUrl = `${baseUrl}/music/playlists/${playlistId}`;
    const shareText = `Check out "${song.name}" by ${song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'} in this playlist: ${playlist.name}`;

    try {
      // Try to use the Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: `${song.name} - ${playlist.name}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);

        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = 'Playlist link copied to clipboard!';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Error sharing song:', error);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Failed to share playlist. Please try again.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  };

  const handleDownloadPlaylist = async () => {
    if (songs.length === 0) {
      // Show toast if no songs to download
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'No songs in playlist to download!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }

    // Show initial toast
    const progressToast = document.createElement('div');
    progressToast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    progressToast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Downloading playlist... (0/${songs.length})</span>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;

    // Download songs with a small delay between each to avoid overwhelming the server
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      try {
        // Update progress
        progressToast.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Downloading "${song.name}"... (${i + 1}/${songs.length})</span>
          </div>
        `;

        await downloadSingleSong(song);
        downloadedCount++;
      } catch (error) {
        console.error(`Failed to download ${song.name}:`, error);
        failedCount++;
      }

      // Small delay between downloads
      if (i < songs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Remove progress toast
    progressToast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(progressToast);
    }, 300);

    // Show completion toast
    const completionToast = document.createElement('div');
    if (failedCount === 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Successfully downloaded all ${downloadedCount} songs from "${playlist.name}"!`;
    } else if (downloadedCount > 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Downloaded ${downloadedCount} songs, ${failedCount} failed from "${playlist.name}"`;
    } else {
      completionToast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Failed to download songs from "${playlist.name}". Please try again.`;
    }

    document.body.appendChild(completionToast);
    setTimeout(() => {
      completionToast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(completionToast);
      }, 300);
    }, 5000);
  };

  const downloadSingleSong = async (song) => {
    // First, try to get download links from the song object
    let downloadUrl = null;

    // Check if song already has download URLs
    if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
      // Look for 320kbps quality first, then fallback to highest available
      const highQuality = song.downloadUrl.find(url => url.quality === '320kbps') ||
        song.downloadUrl.find(url => url.quality === '160kbps') ||
        song.downloadUrl[song.downloadUrl.length - 1];
      downloadUrl = highQuality?.url;
    }

    // If no download URL found, fetch from API
    if (!downloadUrl) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
      const data = await response.json();

      if (data.success && data.data && data.data[0]?.downloadUrl) {
        const songData = data.data[0];
        // Look for 320kbps quality first, then fallback to highest available
        const highQuality = songData.downloadUrl.find(url => url.quality === '320kbps') ||
          songData.downloadUrl.find(url => url.quality === '160kbps') ||
          songData.downloadUrl[songData.downloadUrl.length - 1];
        downloadUrl = highQuality?.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('No download URL available');
    }

    const filename = `${song.name} - ${song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}.mp3`;

    try {
      // Fetch the file as a blob
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/mpeg, audio/mp4, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the file as a blob
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element for download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

    } catch (fetchError) {
      // Fallback: try direct link method if blob fetch fails
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadSong = async (song) => {
    try {
      console.log('Attempting to download song:', song.name);

      // First, try to get download links from the song object
      let downloadUrl = null;

      // Check if song already has download URLs
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        // Look for 320kbps quality first, then fallback to highest available
        const highQuality = song.downloadUrl.find(url => url.quality === '320kbps') ||
          song.downloadUrl.find(url => url.quality === '160kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];
        downloadUrl = highQuality?.url;
      }

      // If no download URL found, fetch from API
      if (!downloadUrl) {
        console.log('No download URL found in song object, fetching from API...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/songs?ids=${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data[0]?.downloadUrl) {
          const songData = data.data[0];
          // Look for 320kbps quality first, then fallback to highest available
          const highQuality = songData.downloadUrl.find(url => url.quality === '320kbps') ||
            songData.downloadUrl.find(url => url.quality === '160kbps') ||
            songData.downloadUrl[songData.downloadUrl.length - 1];
          downloadUrl = highQuality?.url;
          console.log('Found download URL from API:', downloadUrl);
        }
      }

      if (downloadUrl) {
        // Fetch the file through your website and trigger direct download
        console.log('Fetching file for download...');

        const filename = `${song.name} - ${song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}.mp3`;

        try {
          // Fetch the file as a blob
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg, audio/mp4, */*'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the file as a blob
          const blob = await response.blob();

          // Create a blob URL
          const blobUrl = window.URL.createObjectURL(blob);

          // Create a temporary anchor element for download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.style.display = 'none';

          // Add to DOM, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL after a short delay
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);

          console.log('Download completed for:', song.name);

          // Show success toast
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
          toast.textContent = 'Download started!';
          document.body.appendChild(toast);

          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
              document.body.removeChild(toast);
            }, 300);
          }, 3000);

        } catch (fetchError) {
          console.error('Error fetching file for download:', fetchError);

          // Fallback: try direct link method if blob fetch fails
          console.log('Falling back to direct link method...');
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Show success toast for fallback method
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
          toast.textContent = 'Download started!';
          document.body.appendChild(toast);

          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
              document.body.removeChild(toast);
            }, 300);
          }, 3000);
        }
      } else {
        console.error('No download URL available for this song');

        // Show error toast if no download URL available
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = 'Download not available for this song.';
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 3000);
      }
    } catch (error) {
      console.error('Error downloading song:', error);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Failed to download song. Please try again.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
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
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-lg" />
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div className="h-6 bg-muted rounded w-24 mx-auto md:mx-0" />
                  <div className="h-8 md:h-12 bg-muted rounded w-48 mx-auto md:mx-0" />
                  <div className="h-4 bg-muted rounded w-32 mx-auto md:mx-0" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Access denied screen for private playlists
  if (accessDenied) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="text-center py-12">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">This playlist is private</h3>
              <p className="text-muted-foreground mb-4">Only the owner can see and play this playlist.</p>
              <Button onClick={() => router.push('/music')}>
                Discover Music
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!playlist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Playlist not found</h3>
              <p className="text-muted-foreground mb-4">The playlist you're looking for doesn't exist.</p>
              <Button onClick={() => router.push('/music/playlists')}>
                Back to Playlists
              </Button>
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
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/playlists">Playlists</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{playlist.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Playlist Header */}
          <div
            className="p-4 md:p-6 text-white"
            style={{
              background: `linear-gradient(to bottom right, ${dominantColors[0]}, ${dominantColors[1]})`
            }}
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden shadow-2xl">
                  {(() => {
                    const cover = getPlaylistCover();

                    if (cover.type === 'single') {
                      return (
                        <img
                          src={cover.src}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/def playlist image.jpg';
                          }}
                        />
                      );
                    } else if (cover.type === 'collage') {
                      return (
                        <div className="w-full h-full grid grid-cols-2 gap-0">
                          {cover.images.map((imageSrc, index) => (
                            <div key={index} className="w-full h-full overflow-hidden">
                              <img
                                src={imageSrc}
                                alt={`Song ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '/def playlist image.jpg';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <img
                          src="/def playlist image.jpg"
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      );
                    }
                  })()}
                </div>
                <div className="space-y-2">
                  <Badge variant="secondary" className="mb-2">
                    {playlist.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  <h1 className="text-2xl font-bold break-words">
                    {playlist.name}
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-sm opacity-80">
                    <span className="font-semibold">{playlist.ownerName || 'Unknown User'}</span>
                    <span>•</span>
                    <span>{playlist.songIds?.length || 0} songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
              <div className="w-60 h-60 rounded-lg overflow-hidden shrink-0 shadow-2xl">
                {(() => {
                  const cover = getPlaylistCover();

                  if (cover.type === 'single') {
                    return (
                      <img
                        src={cover.src}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/def playlist image.jpg';
                        }}
                      />
                    );
                  } else if (cover.type === 'collage') {
                    return (
                      <div className="w-full h-full grid grid-cols-2 gap-0.5">
                        {cover.images.map((imageSrc, index) => (
                          <div key={index} className="w-full h-full overflow-hidden">
                            <img
                              src={imageSrc}
                              alt={`Song ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/def playlist image.jpg';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <img
                        src="/def playlist image.jpg"
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    );
                  }
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">
                  {playlist.isPublic ? 'Public' : 'Private'}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 break-words">
                  {playlist.name}
                </h1>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <span className="font-semibold">{playlist.ownerName || 'Unknown User'}</span>
                  <span>•</span>
                  <span>{playlist.songIds?.length || 0} songs</span>
                  {playlist.createdAt && (
                    <>
                      <span>•</span>
                      <span>Created {formatDate(playlist.createdAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className="p-4 md:p-6"
            style={{
              background: `linear-gradient(to bottom, ${dominantColors[0]}20, transparent)`
            }}
          >
            <div className="flex items-center gap-3 md:gap-4">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-transform bg-green-500 hover:bg-green-600"
                onClick={handlePlayAll}
                disabled={songs.length === 0}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5 md:ml-1" />
              </Button>

              {/* Heart Button - Only show for non-owners and public playlists */}
              {!isOwner && playlist.isPublic && (
                <Button
                  variant="ghost"
                  size="lg"
                  className={`rounded-full w-10 h-10 md:w-12 md:h-12 transition-all duration-200 ${isLiked
                    ? 'text-red-500 hover:text-red-600 hover:scale-110'
                    : 'text-white hover:text-red-500 hover:scale-110'
                    }`}
                  onClick={handleToggleLike}
                  disabled={likingInProgress}
                >
                  <Heart
                    className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-200 ${isLiked ? 'fill-current' : ''
                      }`}
                  />
                </Button>
              )}
              <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full w-10 h-10 md:w-12 md:h-12"
                onClick={handleDownloadPlaylist}
                disabled={songs.length === 0}
              >
                <Download className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                    <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[9999]">
                  {/* Owner-only options */}
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={handleEditPlaylist}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit playlist
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleTogglePrivacy}>
                        {playlist.isPublic ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Make private
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Make public
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Share option - available to everyone for public playlists */}
                  <DropdownMenuItem onClick={handleSharePlaylist}>
                    <Share className="w-4 h-4 mr-2" />
                    Share playlist
                  </DropdownMenuItem>

                  {/* Delete option - owner only */}
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-500 hover:text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete playlist
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete playlist</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeletePlaylist}
                              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Songs List */}
          <div className="px-3 md:px-6 pb-24">
            {songs.length > 0 ? (
              <>
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                  <div className="w-8 text-center">#</div>
                  <div>Title</div>
                  <div>Album</div>
                  <div>Date added</div>
                  <div className="flex items-center justify-end gap-1">
                    <div className="min-w-[40px] text-right">
                      <Clock className="w-4 h-4 ml-auto" />
                    </div>
                    <div className="w-8"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  {songs.map((song, index) => {
                    const isCurrentSong = currentSong?.id === song.id;
                    return (
                      <div key={song.id || index}>
                        {/* Mobile Layout */}
                        <div
                          className={`md:hidden flex items-center gap-3 p-3 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''}`}
                          onClick={() => handlePlayClick(song, index)}
                        >
                          <div className="w-6 text-center flex-shrink-0">
                            {isCurrentSong && isPlaying ? (
                              <div className="flex items-center justify-center">
                                <div className="flex space-x-0.5">
                                  <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                                  <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                              </div>
                            ) : isCurrentSong ? (
                              <Play className="w-4 h-4 mx-auto text-green-500" />
                            ) : (
                              <>
                                <span className="text-muted-foreground group-hover:hidden text-sm">
                                  {index + 1}
                                </span>
                                <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                              </>
                            )}
                          </div>

                          <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                            {song.image?.length > 0 ? (
                              <img
                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                  song.image.find(img => img.quality === '150x150')?.url ||
                                  song.image[song.image.length - 1]?.url}
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-4 h-4 opacity-50" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''}`}>
                              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                            </p>
                            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {song.artists?.primary?.length > 0 ? (
                                song.artists.primary.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    {artist.name}
                                    {artistIndex < song.artists.primary.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                'Unknown Artist'
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-xs text-muted-foreground min-w-[35px] text-right">
                              {formatDuration(song.duration)}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 h-8 w-8 text-muted-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 z-[9999]">
                                {isOwner && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromPlaylist(song.id);
                                      }}
                                      className="text-red-500 hover:text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                    >
                                      <Minus className="w-4 h-4 mr-2" />
                                      Remove
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  if (song.artists?.primary?.length > 0) {
                                    router.push(`/music/artist/${song.artists.primary[0].id}`);
                                  }
                                }}>
                                  <User className="w-4 h-4 mr-2" />
                                  Go to artist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  if (song.album?.id) {
                                    router.push(`/music/album/${song.album.id}`);
                                  }
                                }}>
                                  <Disc className="w-4 h-4 mr-2" />
                                  Go to album
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadSong(song);
                                }}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div
                          className={`hidden md:grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center p-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''}`}
                          onClick={() => handlePlayClick(song, index)}
                        >
                          <div className="w-8 text-center">
                            {isCurrentSong && isPlaying ? (
                              <div className="flex items-center justify-center">
                                <div className="flex space-x-0.5">
                                  <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                                  <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                              </div>
                            ) : isCurrentSong ? (
                              <Play className="w-4 h-4 mx-auto text-green-500" />
                            ) : (
                              <>
                                <span className="text-muted-foreground group-hover:hidden">
                                  {index + 1}
                                </span>
                                <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                              {song.image?.length > 0 ? (
                                <img
                                  src={song.image.find(img => img.quality === '500x500')?.url ||
                                    song.image.find(img => img.quality === '150x150')?.url ||
                                    song.image[song.image.length - 1]?.url}
                                  alt={song.name}
                                  className="w-full h-full object-cover rounded"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="w-4 h-4 opacity-50" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''}`}>
                                {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                              </p>
                              <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}>
                                {song.artists?.primary?.length > 0 ? (
                                  song.artists.primary.map((artist, artistIndex) => (
                                    <span key={artist.id || artistIndex}>
                                      <button
                                        className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/music/artist/${artist.id}`);
                                        }}
                                      >
                                        {decodeHtmlEntities(artist.name)}
                                      </button>
                                      {artistIndex < song.artists.primary.length - 1 && ', '}
                                    </span>
                                  ))
                                ) : (
                                  'Unknown Artist'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground truncate">
                            {song.album?.name ? (
                              <button
                                className="hover:underline hover:text-foreground transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (song.album.id) {
                                    router.push(`/music/album/${song.album.id}`);
                                  }
                                }}
                              >
                                {decodeHtmlEntities(song.album.name)}
                              </button>
                            ) : (
                              'Unknown Album'
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {formatDate(new Date())}
                          </div>

                          <div className="flex items-center justify-end gap-1">
                            <div className="text-sm text-muted-foreground min-w-[40px] text-right">
                              {formatDuration(song.duration)}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 z-[9999]">
                                {isOwner && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromPlaylist(song.id);
                                      }}
                                      className="text-red-500 hover:text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                    >
                                      <Minus className="w-4 h-4 mr-2" />
                                      Remove
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  if (song.artists?.primary?.length > 0) {
                                    router.push(`/music/artist/${song.artists.primary[0].id}`);
                                  }
                                }}>
                                  <User className="w-4 h-4 mr-2" />
                                  Go to artist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  if (song.album?.id) {
                                    router.push(`/music/album/${song.album.id}`);
                                  }
                                }}>
                                  <Disc className="w-4 h-4 mr-2" />
                                  Go to album
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadSong(song);
                                }}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ListMusic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Your playlist is empty</h3>
                <p className="text-muted-foreground mb-4">Add songs to start building your playlist</p>
                <Button onClick={() => router.push('/music')}>
                  Find music to add
                </Button>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Edit Playlist Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit playlist</DialogTitle>
            <DialogDescription>
              Make changes to your playlist details here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
                placeholder="Playlist name"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="col-span-3"
                placeholder="Add a description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}