import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedPlaylist from '@/models/LikedPlaylist';
import mongoose from 'mongoose';

// GET - Fetch all liked playlists for a user
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const likedPlaylists = await LikedPlaylist.findByUser(new mongoose.Types.ObjectId(userId));
    
    return NextResponse.json({
      success: true,
      data: likedPlaylists,
      count: likedPlaylists.length
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
    await connectDB();
    
    const body = await request.json();
    const { userId, playlistData } = body;
    
    if (!userId || !playlistData) {
      return NextResponse.json(
        { success: false, error: 'User ID and playlist data are required' },
        { status: 400 }
      );
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const result = await LikedPlaylist.toggleLike(new mongoose.Types.ObjectId(userId), playlistData);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error toggling playlist like:', error);
    
    // Handle duplicate key error (trying to like the same playlist twice)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Playlist already liked' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to toggle playlist like' },
      { status: 500 }
    );
  }
}