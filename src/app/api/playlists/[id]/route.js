import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET - Get specific playlist (with privacy controls)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // First, try to find the playlist
    const playlist = await Playlist.findById(id).lean();
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Fetch the owner's information
    const owner = await User.findById(playlist.userId).select('name').lean();
    const ownerName = owner ? owner.name : 'Unknown User';

    // Check access permissions
    const isOwner = session?.user?.id && playlist.userId.toString() === session.user.id;
    const isPublic = playlist.isPublic;

    // Private playlist access rules
    if (!isPublic) {
      // Private playlists can only be accessed by the owner
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'This playlist is private' },
          { status: 403 }
        );
      }
    }

    // Return playlist data with owner name
    return NextResponse.json({
      success: true,
      data: {
        ...playlist,
        ownerName: ownerName,
        isOwner: isOwner
      }
    });
    
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

// PUT - Update playlist
export async function PUT(request, { params }) {
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
    const { name, description, isPublic } = body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
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
    
    // Update fields if provided
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Playlist name is required' },
          { status: 400 }
        );
      }
      playlist.name = name.trim();
    }
    
    if (description !== undefined) {
      playlist.description = description.trim();
    }
    
    if (isPublic !== undefined) {
      playlist.isPublic = isPublic;
    }
    
    await playlist.save();
    
    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update playlist (for privacy toggle, etc.)
export async function PATCH(request, { params }) {
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
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
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
    
    // Update only the provided fields
    Object.keys(body).forEach(key => {
      if (key === 'isPublic' && typeof body[key] === 'boolean') {
        playlist.isPublic = body[key];
      } else if (key === 'name' && body[key] && body[key].trim().length > 0) {
        playlist.name = body[key].trim();
      } else if (key === 'description') {
        playlist.description = body[key] ? body[key].trim() : '';
      } else if (key === 'songIds' && Array.isArray(body[key])) {
        playlist.songIds = body[key];
      }
    });
    
    await playlist.save();
    
    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Delete playlist
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
    
    const playlist = await Playlist.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}