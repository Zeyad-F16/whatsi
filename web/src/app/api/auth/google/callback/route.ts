import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import db from '@/lib/db';
import { generateUserToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/login?error=Google login was cancelled', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=No authentication code provided', request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Exact same redirect URI as the one used to generate the URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=Google Auth not configured', request.url));
    }

    const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Get tokens from Google using the code
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Fetch user info using the access token
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await res.json();
    const { email, name, picture } = userInfo;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=Email not provided by Google', request.url));
    }

    // Check if user exists in database
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      // Create new user, bypass email verification since Google verified it
      const randomPassword = uuidv4() + uuidv4(); 
      const salt = await require('bcryptjs').genSalt(10);
      const hashedPassword = await require('bcryptjs').hash(randomPassword, salt);

      const stmt = db.prepare(`
        INSERT INTO users (name, email, password_hash, phone, is_verified, google_id)
        VALUES (?, ?, ?, ?, 1, ?)
      `);
      
      const result = stmt.run(name, email, hashedPassword, '', userInfo.id || null);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
    } else if (!user.is_verified) {
      // If user exists but is not verified, verify them since they logged in with Google
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(user.id);
    }

    // Generate token and login automatically
    const token = generateUserToken(user.id, user.email);
    
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    response.cookies.set({
      name: 'whatsi_user_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (err) {
    console.error('Google Auth Callback Error:', err);
    return NextResponse.redirect(new URL('/login?error=Google authentication failed', request.url));
  }
}
