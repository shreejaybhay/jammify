import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

// Simple in-memory cache for online users (5-second cache)
let onlineUsersCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 seconds
};

function getCachedOnlineUsers() {
  const now = Date.now();
  if (onlineUsersCache.data && (now - onlineUsersCache.timestamp) < onlineUsersCache.ttl) {
    return onlineUsersCache.data;
  }
  return null;
}

function setCachedOnlineUsers(data) {
  onlineUsersCache.data = data;
  onlineUsersCache.timestamp = Date.now();
}

// GET - Get online users count and list with enhanced status and caching
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeList = searchParams.get('includeList') === 'true';
    
    // Check cache first for list requests
    if (includeList) {
      const cached = getCachedOnlineUsers();
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    await connectDB();
    
    const onlineCount = await User.countOnlineUsers();
    
    const response = {
      success: true,
      onlineCount,
      timestamp: new Date().toISOString(),
      cached: false
    };
    
    // Include enhanced user list with status information
    if (includeList) {
      const onlineUsers = await User.getOnlineUsersWithStatus();
      response.onlineUsers = onlineUsers;
      
      // Cache the response for future requests
      setCachedOnlineUsers({
        success: true,
        onlineCount,
        onlineUsers
      });
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

// POST - Enhanced heartbeat with activity tracking
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
    
    // Parse request body for additional heartbeat data
    let heartbeatData = {};
    try {
      heartbeatData = await request.json();
    } catch (e) {
      // If no body or invalid JSON, continue with default behavior
    }
    
    const now = new Date();
    
    // Update user's last active timestamp with enhanced tracking
    const updateData = {
      lastActive: now
    };
    
    // Add heartbeat metadata if provided
    if (heartbeatData.timestamp) {
      updateData.lastHeartbeat = new Date(heartbeatData.timestamp);
    }
    
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { new: true, upsert: false }
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      lastActive: user.lastActive,
      serverTime: now.toISOString(),
      isImmediate: heartbeatData.isImmediate || false
    });
    
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}