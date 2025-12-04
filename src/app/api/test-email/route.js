import { NextResponse } from 'next/server';
import { sendOTPEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Generate test OTP
    const testOTP = '123456';
    
    const result = await sendOTPEmail(email, testOTP, name);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        otp: testOTP, // Only for testing - remove in production
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}