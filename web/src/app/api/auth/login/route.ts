import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateUserToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. IP Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = rateLimit(ip, 10, 15 * 60 * 1000); // 10 attempts / 15 mins
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many login attempts from this IP. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    
    // 2. Zod Validation & Sanitization
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, message: validationResult.error.errors[0].message }, { status: 400 });
    }

    const { email, password } = validationResult.data;

    // Fetch user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ success: false, message: 'Account registered via Google, please sign in with Google' }, { status: 400 });
    }

    // 3. Account Lockout Check
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until).getTime();
      if (Date.now() < lockTime) {
        return NextResponse.json({ success: false, message: 'Account locked due to too many failed attempts. Please try again later.' }, { status: 403 });
      } else {
        // Lock expired, reset
        db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      }
    }

    // 4. Password Check
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      if (newAttempts >= 10) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(newAttempts, lockUntil, user.id);
        return NextResponse.json({ success: false, message: 'Account locked due to too many failed attempts. Please try again in 15 minutes.' }, { status: 401 });
      } else {
        db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?').run(newAttempts, user.id);
        return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
      }
    }

    // 5. Success - Reset failed attempts
    if (user.failed_login_attempts > 0) {
      db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    }

    // Verify Email check
    if (!user.is_verified) {
      return NextResponse.json({ success: false, message: 'You must verify your account first', requiresVerification: true }, { status: 403 });
    }

    // Generate Token
    const token = generateUserToken(user.id, user.email);
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
    
    // 6. Secure HttpOnly Cookie
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
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
