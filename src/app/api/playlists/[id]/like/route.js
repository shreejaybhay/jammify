import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import LikedPlaylist from '@/models/LikedPlaylist';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// POST - Like/Save a playlist
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Check if playlist exists and is public (or user is owner)
    const playlist = await Playlist.findById(id).lean();
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    const isOwner = playlist.userId.toString() === session.user.id;
    
    // Can't like your own playlist
    if (isOwner) {
      return NextResponse.json(
        { success: false, error: 'You cannot like your own playlist' },
        { status: 400 }
      );
    }

    // Can only like public playlists
    if (!playlist.isPublic) {
      return NextResponse.json(
        { success: false, error: 'Cannot like private playlists' },
        { status: 403 }
      );
    }

    // Check if already liked
    const existingLike = await LikedPlaylist.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
      playlistId: new mongoose.Types.ObjectId(id)
    });

    if (existingLike) {
      return NextResponse.json(
        { success: false, error: 'Playlist already saved to your library' },
        { status: 409 }
      );
    }

    // Create new liked playlist entry
    const likedPlaylist = new LikedPlaylist({
      userId: new mongoose.Types.ObjectId(session.user.id),
      playlistId: new mongoose.Types.ObjectId(id),
      playlistName: playlist.name,
      playlistOwner: playlist.userId,
      songCount: playlist.songIds?.length || 0,
      isPublic: playlist.isPublic
    });

    await likedPlaylist.save();

    return NextResponse.json({
      success: true,
      message: 'Playlist saved to your library',
      data: likedPlaylist
    });
    
  } catch (error) {
    console.error('Error liking playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Unlike/Remove a playlist from library
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Remove from liked playlists
    const result = await LikedPlaylist.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(session.user.id),
      playlistId: new mongoose.Types.ObjectId(id)
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found in your library' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist removed from your library'
    });
    
  } catch (error) {
    console.error('Error unliking playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove playlist' },
      { status: 500 }
    );
  }
}

// GET - Check if playlist is liked by user
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: true, isLiked: false }
      );
    }

    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const likedPlaylist = await LikedPlaylist.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
      playlistId: new mongoose.Types.ObjectId(id)
    });

    return NextResponse.json({
      success: true,
      isLiked: !!likedPlaylist
    });
    
  } catch (error) {
    console.error('Error checking playlist like status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}