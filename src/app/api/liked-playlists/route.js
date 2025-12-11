import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import LikedPlaylist from '@/models/LikedPlaylist';

// GET - Get all liked playlists for the authenticated user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and requesting their own data
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const likedPlaylists = await LikedPlaylist.find({ userId })
      .sort({ likedAt: -1 }) // Most recent first
      .lean();
    
    return NextResponse.json({
      success: true,
      data: likedPlaylists
    });
    
  } catch (error) {
    console.error('Error fetching liked playlists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch liked playlists' },
      { status: 500 }
    );
  }
}

// POST - Toggle like/unlike a playlist
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, playlistData } = await request.json();
    
    if (!userId || !playlistData) {
      return NextResponse.json(
        { success: false, error: 'User ID and playlist data are required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and acting on their own behalf
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Check if playlist is already liked
    const existingLike = await LikedPlaylist.findOne({
      userId,
      playlistId: playlistData.id
    });

    if (existingLike) {
      // Unlike the playlist
      await LikedPlaylist.deleteOne({
        userId,
        playlistId: playlistData.id
      });
      
      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Playlist removed from favorites'
      });
    } else {
      // Like the playlist
      const likedPlaylist = new LikedPlaylist({
        userId,
        playlistId: playlistData.id,
        playlistName: playlistData.name || playlistData.title,
        description: playlistData.description || '',
        image: playlistData.image || [],
        songCount: playlistData.songCount || playlistData.song_count || 0,
        likedAt: new Date()
      });
      
      await likedPlaylist.save();
      
      return NextResponse.json({
        success: true,
        liked: true,
        message: 'Playlist added to favorites',
        data: likedPlaylist
      });
    }
    
  } catch (error) {
    console.error('Error toggling playlist like:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle playlist like' },
      { status: 500 }
    );
  }
}