import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedArtist from '@/models/LikedArtist';
import mongoose from 'mongoose';

// GET - Fetch all liked artists for a user
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
    
    const likedArtists = await LikedArtist.findByUser(new mongoose.Types.ObjectId(userId));
    
    return NextResponse.json({
      success: true,
      data: likedArtists,
      count: likedArtists.length
    });
    
  } catch (error) {
    console.error('Error fetching liked artists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch liked artists' },
      { status: 500 }
    );
  }
}

// POST - Toggle like/unlike an artist
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, artistId } = body;
    
    if (!userId || !artistId) {
      return NextResponse.json(
        { success: false, error: 'User ID and artist ID are required' },
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
    
    const result = await LikedArtist.toggleLike(new mongoose.Types.ObjectId(userId), artistId);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error toggling artist like:', error);
    
    // Handle duplicate key error (trying to like the same artist twice)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Artist already liked' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to toggle artist like' },
      { status: 500 }
    );
  }
}