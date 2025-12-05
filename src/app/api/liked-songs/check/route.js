import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedSong from '@/models/LikedSong';

// GET - Check if a specific song is liked by a user
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const songId = searchParams.get('songId');
    
    if (!userId || !songId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Song ID are required' },
        { status: 400 }
      );
    }
    
    const likedSong = await LikedSong.isLiked(userId, songId);
    
    return NextResponse.json({
      success: true,
      isLiked: !!likedSong,
      likedAt: likedSong?.likedAt || null
    });
    
  } catch (error) {
    console.error('Error checking liked song:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check liked song' },
      { status: 500 }
    );
  }
}