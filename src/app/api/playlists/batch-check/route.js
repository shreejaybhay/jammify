import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// POST - Batch check playlist accessibility
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { playlistIds, userId } = await request.json();
    
    if (!playlistIds || !Array.isArray(playlistIds) || !userId) {
      return NextResponse.json(
        { success: false, error: 'Playlist IDs array and user ID are required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and acting on their own behalf
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Convert playlist IDs to ObjectIds and check accessibility
    const results = await Promise.all(
      playlistIds.map(async (playlistId) => {
        try {
          // Validate ObjectId format
          if (!mongoose.Types.ObjectId.isValid(playlistId)) {
            return {
              playlistId,
              isAccessible: false,
              error: 'Invalid playlist ID format'
            };
          }

          const playlist = await Playlist.findById(playlistId).lean();
          
          if (!playlist) {
            return {
              playlistId,
              isAccessible: false,
              error: 'Playlist not found'
            };
          }

          // Check if playlist is accessible (public or owned by user)
          const isAccessible = playlist.isPublic || playlist.userId.toString() === userId;
          
          return {
            playlistId,
            isAccessible,
            playlist: isAccessible ? {
              name: playlist.name,
              description: playlist.description,
              songCount: playlist.songIds?.length || 0,
              isPublic: playlist.isPublic,
              isOwner: playlist.userId.toString() === userId
            } : null
          };
          
        } catch (error) {
          console.error(`Error checking playlist ${playlistId}:`, error);
          return {
            playlistId,
            isAccessible: false,
            error: error.message
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('Error in batch playlist check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check playlist accessibility' },
      { status: 500 }
    );
  }
}