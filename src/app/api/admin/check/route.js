import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin-middleware';

// GET - Check if current user has admin access
export async function GET(request) {
  try {
    const { isAdmin, user, error } = await checkAdminAccess(request);
    
    if (error && !user) {
      return NextResponse.json(
        { success: false, error, isAdmin: false },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      isAdmin,
      user: isAdmin ? user : null, // Only return user details if admin
      message: isAdmin ? 'Admin access confirmed' : 'Regular user access'
    });
    
  } catch (error) {
    console.error('Admin check API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check admin status', isAdmin: false },
      { status: 500 }
    );
  }
}