import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedAlbum from '@/models/LikedAlbum';

// GET - Get all liked albums for a user
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
    
    const likedAlbums = await LikedAlbum.findByUser(userId);
    
    return NextResponse.json({
      success: true,
      data: likedAlbums,
      count: likedAlbums.length
    });
    
  } catch (error) {
    console.error('Error fetching liked albums:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch liked albums' },
      { status: 500 }
    );
  }
}

// POST - Toggle like/unlike for an album
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, albumData } = body;
    
    if (!userId || !albumData) {
      return NextResponse.json(
        { success: false, error: 'User ID and album data are required' },
        { status: 400 }
      );
    }
    
    const result = await LikedAlbum.toggleLike(userId, albumData);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error toggling album like:', error);
    
    // Handle duplicate key error (trying to like the same album twice)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Album already liked' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to toggle album like' },
      { status: 500 }
    );
  }
}