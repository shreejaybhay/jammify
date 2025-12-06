import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedPlaylist from '@/models/LikedPlaylist';
import mongoose from 'mongoose';

// GET - Check if a specific playlist is liked by a user
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const playlistId = searchParams.get('playlistId');
    
    if (!userId || !playlistId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Playlist ID are required' },
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
    
    const likedPlaylist = await LikedPlaylist.isLiked(new mongoose.Types.ObjectId(userId), playlistId);
    
    return NextResponse.json({
      success: true,
      isLiked: !!likedPlaylist,
      likedAt: likedPlaylist?.likedAt || null
    });
    
  } catch (error) {
    console.error('Error checking liked playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check liked playlist' },
      { status: 500 }
    );
  }
}