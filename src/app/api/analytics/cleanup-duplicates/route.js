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
    
    // Get all daily active user records
    const allRecords = await DailyActiveUser.find({});
    let totalCleaned = 0;
    let recordsProcessed = 0;
    
    for (const record of allRecords) {
      const uniqueUsers = [];
      const seenEmails = new Set();
      
      // Remove duplicates by email
      for (const user of record.users) {
        if (!seenEmails.has(user.email)) {
          seenEmails.add(user.email);
          uniqueUsers.push(user);
        }
      }
      
      // Update record if duplicates were found
      if (uniqueUsers.length !== record.users.length) {
        await DailyActiveUser.findByIdAndUpdate(record._id, {
          users: uniqueUsers,
          totalUsers: uniqueUsers.length
        });
        
        totalCleaned += (record.users.length - uniqueUsers.length);
        recordsProcessed++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed',
      recordsProcessed,
      duplicatesRemoved: totalCleaned,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup duplicates' },
      { status: 500 }
    );
  }
}