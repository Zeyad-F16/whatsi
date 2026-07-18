import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import db from '@/lib/db';
import { generateUserToken } from '@/lib/auth';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ success: false, message: 'Missing credential' }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ success: false, message: 'Invalid Google token' }, { status: 400 });
    }

    const { email, name, sub: google_id } = payload;

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      // Register new user via Google
      const stmt = db.prepare(`
        INSERT INTO users (name, email, google_id, is_verified) 
        VALUES (?, ?, ?, 1)
      `);
      const result = stmt.run(name || 'مستخدم جوجل', email, google_id);
      user = { id: result.lastInsertRowid, email, name };
    } else {
      // User exists, just update google_id if it's missing, and set verified
      if (!user.google_id || !user.is_verified) {
        db.prepare('UPDATE users SET google_id = ?, is_verified = 1 WHERE id = ?').run(google_id, user.id);
      }
    }

    const token = generateUserToken(user.id, user.email);
    
    const response = NextResponse.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
    
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
    console.error('Google auth error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول بحساب جوجل' }, { status: 500 });
  }
}
