import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import DailyActiveUser from '@/models/DailyActiveUser';

// Cache for daily stats (5 minutes TTL) - keyed by query parameters
let dailyStatsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(days, format) {
  return `${days}-${format}`;
}

function getCachedDailyStats(days, format) {
  const key = getCacheKey(days, format);
  const cached = dailyStatsCache.get(key);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedDailyStats(days, format, data) {
  const key = getCacheKey(days, format);
  dailyStatsCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 30;
    const format = searchParams.get('format') || 'chart'; // 'chart' or 'table'
    
    // Check cache first with query parameters
    const cachedData = getCachedDailyStats(days, format);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch daily stats
    const stats = await DailyActiveUser.getDailyStats(days);

    // Fill in missing dates with 0 users
    const filledStats = fillMissingDates(stats, days);

    // Format data based on request
    let responseData;
    if (format === 'table') {
      responseData = {
        stats: filledStats,
        summary: calculateSummary(filledStats)
      };
    } else {
      // Format for chart (Recharts)
      responseData = {
        chartData: filledStats.map(stat => ({
          date: stat.date,
          users: stat.totalUsers,
          formattedDate: formatDateForDisplay(stat.date)
        })),
        summary: calculateSummary(filledStats)
      };
    }

    // Cache the result
    setCachedDailyStats(days, format, responseData);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching daily user stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily user stats' },
      { status: 500 }
    );
  }
}

// Helper function to fill missing dates
function fillMissingDates(stats, days) {
  const filledStats = [];
  const endDate = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const currentDate = new Date();
    currentDate.setDate(endDate.getDate() - i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const existingStat = stats.find(stat => stat.date === dateStr);
    filledStats.push({
      date: dateStr,
      totalUsers: existingStat ? existingStat.totalUsers : 0
    });
  }

  return filledStats;
}

// Helper function to calculate summary statistics
function calculateSummary(stats) {
  const totalDays = stats.length;
  const totalUsers = stats.reduce((sum, stat) => sum + stat.totalUsers, 0);
  const averageUsers = totalDays > 0 ? Math.round(totalUsers / totalDays * 100) / 100 : 0;
  const maxUsers = Math.max(...stats.map(stat => stat.totalUsers));
  const minUsers = Math.min(...stats.map(stat => stat.totalUsers));

  // Calculate trend (last 7 days vs previous 7 days)
  const last7Days = stats.slice(-7);
  const previous7Days = stats.slice(-14, -7);

  const last7Average = last7Days.length > 0 ?
    last7Days.reduce((sum, stat) => sum + stat.totalUsers, 0) / last7Days.length : 0;
  const previous7Average = previous7Days.length > 0 ?
    previous7Days.reduce((sum, stat) => sum + stat.totalUsers, 0) / previous7Days.length : 0;

  const trendPercentage = previous7Average > 0 ?
    Math.round(((last7Average - previous7Average) / previous7Average) * 100 * 100) / 100 : 0;

  return {
    totalDays,
    totalUsers,
    averageUsers,
    maxUsers,
    minUsers,
    last7DaysAverage: Math.round(last7Average * 100) / 100,
    trendPercentage,
    trendDirection: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable'
  };
}

// Helper function to format date for display
function formatDateForDisplay(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}