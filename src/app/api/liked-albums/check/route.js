import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedAlbum from '@/models/LikedAlbum';
import mongoose from 'mongoose';

// GET - Check if a specific album is liked by a user
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const albumId = searchParams.get('albumId');
    
    if (!userId || !albumId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Album ID are required' },
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
    
    const likedAlbum = await LikedAlbum.isLiked(new mongoose.Types.ObjectId(userId), albumId);
    
    return NextResponse.json({
      success: true,
      isLiked: !!likedAlbum,
      likedAt: likedAlbum?.likedAt || null
    });
    
  } catch (error) {
    console.error('Error checking liked album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check liked album' },
      { status: 500 }
    );
  }
}