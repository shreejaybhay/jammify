import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 });
    }

    await connectDB();

    // Search public playlists by name and description
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    
    const publicPlaylists = await Playlist.find({
      isPublic: true, // Only public playlists
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ]
    })
    .populate('userId', 'name email image') // Get user info
    .sort({ 
      createdAt: -1, // Most recent first
      'songs.length': -1 // Then by number of songs
    })
    .limit(20) // Limit results
    .lean();

    // Fetch song data for playlists to generate covers
    const playlistsWithSongs = await Promise.all(
      publicPlaylists.map(async (playlist) => {
        let songsData = [];
        
        if (playlist.songIds && playlist.songIds.length > 0) {
          try {
            // Fetch first 4 songs for cover generation
            const songsToFetch = playlist.songIds.slice(0, 4);
            const songPromises = songsToFetch.map(async (songId) => {
              try {
                const response = await fetch(`https://jiosaavn-api-blush.vercel.app/api/songs/${songId}`);
                const data = await response.json();
                if (data.success && data.data && data.data.length > 0) {
                  return data.data[0];
                }
                return null;
              } catch (error) {
                console.error(`Error fetching song ${songId}:`, error);
                return null;
              }
            });

            const fetchedSongs = await Promise.all(songPromises);
            songsData = fetchedSongs.filter(song => song !== null);
            // Debug: Log successful song fetches
            if (songsData.length > 0) {
              console.log(`✅ Playlist "${playlist.name}" loaded ${songsData.length} songs for cover`);
            }
          } catch (error) {
            console.error('Error fetching songs for playlist:', error);
          }
        }

        return {
          ...playlist,
          songs: songsData
        };
      })
    );

    // Transform the data to match the expected playlist format
    const transformedPlaylists = playlistsWithSongs.map(playlist => ({
      id: playlist._id.toString(),
      title: playlist.name,
      name: playlist.name,
      subtitle: `By ${playlist.userId?.name || 'Unknown User'}`,
      description: playlist.description || '',
      image: playlist.image ? [
        { quality: '50x50', url: playlist.image },
        { quality: '150x150', url: playlist.image },
        { quality: '500x500', url: playlist.image }
      ] : null, // Set to null if no custom image
      songCount: playlist.songIds?.length || 0,
      songs: playlist.songs || [],
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      userId: playlist.userId?._id?.toString(),
      userName: playlist.userId?.name,
      userImage: playlist.userId?.image,
      type: 'user-playlist', // Distinguish from API playlists
      source: 'user-created'
    }));

    return NextResponse.json({
      success: true,
      data: transformedPlaylists
    });

  } catch (error) {
    console.error('Error searching public playlists:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search public playlists'
    }, { status: 500 });
  }
}