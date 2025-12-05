import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedArtist from '@/models/LikedArtist';

// GET - Check if a specific artist is liked by a user
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const artistId = searchParams.get('artistId');
    
    if (!userId || !artistId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Artist ID are required' },
        { status: 400 }
      );
    }
    
    const likedArtist = await LikedArtist.isLiked(userId, artistId);
    
    return NextResponse.json({
      success: true,
      isLiked: !!likedArtist,
      likedAt: likedArtist?.likedAt || null
    });
    
  } catch (error) {
    console.error('Error checking liked artist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check liked artist' },
      { status: 500 }
    );
  }
}