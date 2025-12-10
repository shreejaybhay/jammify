import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET - Get online users count and list
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const includeList = searchParams.get('includeList') === 'true';
    
    const onlineCount = await User.countOnlineUsers();
    
    const response = {
      success: true,
      onlineCount,
    };
    
    // Optionally include the list of online users
    if (includeList) {
      const onlineUsers = await User.getOnlineUsers();
      response.onlineUsers = onlineUsers;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}

// POST - Update user's last active timestamp
export async function POST(request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Update user's last active timestamp
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { lastActive: new Date() },
      { new: true }
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Last active timestamp updated',
      lastActive: user.lastActive
    });
    
  } catch (error) {
    console.error('Error updating last active:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update last active' },
      { status: 500 }
    );
  }
}