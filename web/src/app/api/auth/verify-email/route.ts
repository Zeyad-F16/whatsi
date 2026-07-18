import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateUserToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ success: false, message: 'Email and code are required' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({ success: false, message: 'Account is already verified' }, { status: 400 });
    }

    if (user.verification_code !== code) {
      return NextResponse.json({ success: false, message: 'Invalid verification code' }, { status: 400 });
    }

    // Verify user
    db.prepare('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);

    // Generate token and login automatically
    const token = generateUserToken(user.id, user.email);
    
    const response = NextResponse.json({ success: true, message: 'Account successfully verified' });
    
    response.cookies.set({
      name: 'whatsi_user_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
