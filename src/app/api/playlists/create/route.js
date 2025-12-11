import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import mongoose from 'mongoose';

// POST - Create new playlist with automatic naming
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Create playlist with automatic naming
        const playlist = await Playlist.createPlaylist(new mongoose.Types.ObjectId(session.user.id));

        return NextResponse.json({
            success: true,
            data: playlist,
            message: 'Playlist created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating playlist:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create playlist' },
            { status: 500 }
        );
    }
}