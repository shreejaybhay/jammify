import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// GET - Get all playlists for the authenticated user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const playlists = await Playlist.find({
      userId: new mongoose.Types.ObjectId(session.user.id)
    })
    .sort({ createdAt: -1 }) // Most recent first
    .lean();
    
    return NextResponse.json({
      success: true,
      data: playlists
    });
    
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}