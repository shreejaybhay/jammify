import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// DELETE - Remove a song from playlist
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id, songId } = await params;
    
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
    
    // Find the playlist and verify ownership
    const playlist = await Playlist.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    // Check if song exists in playlist
    if (!playlist.songIds.includes(songId)) {
      return NextResponse.json(
        { success: false, error: 'Song not found in playlist' },
        { status: 404 }
      );
    }

    // Remove the song from the playlist
    playlist.songIds = playlist.songIds.filter(id => id !== songId);
    await playlist.save();

    return NextResponse.json({
      success: true,
      message: 'Song removed from playlist successfully',
      data: {
        playlistId: playlist._id,
        songId: songId,
        remainingSongs: playlist.songIds.length
      }
    });
    
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove song from playlist' },
      { status: 500 }
    );
  }
}