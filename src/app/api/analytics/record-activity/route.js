import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import DailyActiveUser from '@/models/DailyActiveUser';

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
    
    // Record user activity for today
    const result = await DailyActiveUser.recordUserActivity(
      session.user.email,
      session.user.name
    );
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error recording user activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record user activity' },
      { status: 500 }
    );
  }
}

// GET method to check if user was recorded today (optional)
export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await DailyActiveUser.findOne({
      date: today,
      'users.email': session.user.email
    });
    
    return NextResponse.json({
      success: true,
      recordedToday: !!existingRecord,
      date: today
    });
    
  } catch (error) {
    console.error('Error checking user activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check user activity' },
      { status: 500 }
    );
  }
}