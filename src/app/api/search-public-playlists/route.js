import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Search for public playlists by title or description
    const playlists = await Playlist.find({
      isPublic: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('userId', 'name image')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    // Transform the data to match the expected format
    const transformedPlaylists = playlists.map(playlist => ({
      id: playlist._id.toString(),
      title: playlist.title,
      description: playlist.description,
      songCount: playlist.songs?.length || 0,
      userName: playlist.userId?.name || 'Unknown User',
      userImage: playlist.userId?.image,
      coverImage: playlist.coverImage,
      songs: playlist.songs || [],
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedPlaylists
    });

  } catch (error) {
    console.error('Public playlists search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search public playlists' },
      { status: 500 }
    );
  }
}