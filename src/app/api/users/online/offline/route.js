import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// POST - Mark user as offline (for page unload events)
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
    
    // Set lastActive to 5 minutes ago to mark as offline
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { lastActive: fiveMinutesAgo },
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
      message: 'User marked as offline',
      lastActive: user.lastActive
    });
    
  } catch (error) {
    console.error('Error marking user offline:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark user offline' },
      { status: 500 }
    );
  }
}