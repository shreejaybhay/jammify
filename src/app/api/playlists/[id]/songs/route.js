import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// POST - Add song to playlist
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
    const body = await request.json();
    const { songId } = body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    if (!songId) {
      return NextResponse.json(
        { success: false, error: 'Song ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const playlist = await Playlist.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    // Check if song is already in playlist
    if (playlist.songIds.includes(songId)) {
      return NextResponse.json(
        { success: false, error: 'Song already in playlist' },
        { status: 400 }
      );
    }
    
    // Add song to playlist
    playlist.songIds.push(songId);
    await playlist.save();
    
    return NextResponse.json({
      success: true,
      data: playlist,
      message: `Song added to "${playlist.name}"`
    });
    
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add song to playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove song from playlist
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
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    if (!songId) {
      return NextResponse.json(
        { success: false, error: 'Song ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const playlist = await Playlist.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    // Check if song is in playlist
    const songIndex = playlist.songIds.indexOf(songId);
    if (songIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Song not found in playlist' },
        { status: 400 }
      );
    }
    
    // Remove song from playlist
    playlist.songIds.splice(songIndex, 1);
    await playlist.save();
    
    return NextResponse.json({
      success: true,
      data: playlist,
      message: `Song removed from "${playlist.name}"`
    });
    
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove song from playlist' },
      { status: 500 }
    );
  }
}