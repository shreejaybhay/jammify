import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Admin middleware to check if user has admin privileges
 * @param {Request} request - The incoming request
 * @returns {Object} - { isAdmin: boolean, user: object, error: string }
 */
export async function checkAdminAccess(request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return {
        isAdmin: false,
        user: null,
        error: 'Authentication required'
      };
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return {
        isAdmin: false,
        user: null,
        error: 'User not found'
      };
    }

    const isAdmin = user.role === 'admin';
    
    return {
      isAdmin,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      error: null
    };
    
  } catch (error) {
    console.error('Admin check error:', error);
    return {
      isAdmin: false,
      user: null,
      error: 'Failed to verify admin access'
    };
  }
}

/**
 * Higher-order function to protect API routes with admin access
 * @param {Function} handler - The API route handler
 * @returns {Function} - Protected API route handler
 */
export function withAdminAuth(handler) {
  return async function(request, ...args) {
    const { isAdmin, user, error } = await checkAdminAccess(request);
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error || 'Admin access required',
          code: 'ADMIN_ACCESS_DENIED'
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Add user info to request for use in handler
    request.adminUser = user;
    
    return handler(request, ...args);
  };
}