import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';

export async function POST(request) {
  try {
    // Get the current session
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No active session found' },
        { status: 401 }
      );
    }

    // Connect to database if you need to log the logout or clean up session data
    await connectDB();
    
    // You can add any custom logout logic here, such as:
    // - Logging the logout event
    // - Clearing user-specific cache
    // - Updating last logout time
    // - Invalidating refresh tokens
    
    console.log(`User ${session.user.email} logged out at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}