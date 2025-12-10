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
    
    // Get all records grouped by date to find duplicates
    const pipeline = [
      {
        $group: {
          _id: "$date",
          records: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ];
    
    const duplicateDates = await DailyActiveUser.aggregate(pipeline);
    let totalCleaned = 0;
    let recordsProcessed = 0;
    let documentsRemoved = 0;
    
    // Process each date that has duplicates
    for (const dateGroup of duplicateDates) {
      const date = dateGroup._id;
      const records = dateGroup.records;
      
      // Merge all users from duplicate records
      const allUsers = [];
      const seenEmails = new Set();
      
      for (const record of records) {
        for (const user of record.users) {
          if (!seenEmails.has(user.email)) {
            seenEmails.add(user.email);
            allUsers.push(user);
          } else {
            totalCleaned++;
          }
        }
      }
      
      // Keep the first record and update it with merged data
      const keepRecord = records[0];
      await DailyActiveUser.findByIdAndUpdate(keepRecord._id, {
        users: allUsers,
        totalUsers: allUsers.length
      });
      
      // Delete the duplicate records
      for (let i = 1; i < records.length; i++) {
        await DailyActiveUser.findByIdAndDelete(records[i]._id);
        documentsRemoved++;
      }
      
      recordsProcessed++;
    }
    
    // Also clean up any remaining duplicates within single documents
    const allRecords = await DailyActiveUser.find({});
    for (const record of allRecords) {
      const uniqueUsers = [];
      const seenEmails = new Set();
      
      for (const user of record.users) {
        if (!seenEmails.has(user.email)) {
          seenEmails.add(user.email);
          uniqueUsers.push(user);
        } else {
          totalCleaned++;
        }
      }
      
      if (uniqueUsers.length !== record.users.length) {
        await DailyActiveUser.findByIdAndUpdate(record._id, {
          users: uniqueUsers,
          totalUsers: uniqueUsers.length
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed',
      recordsProcessed,
      duplicatesRemoved: totalCleaned,
      documentsRemoved,
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