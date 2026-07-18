import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // We need to construct the exact same redirect URI that we'll use in the callback
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: false, message: 'Google OAuth credentials not configured in .env' }, { status: 500 });
    }

    const oAuth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    return NextResponse.json({ success: true, url: authorizeUrl });
  } catch (error) {
    console.error('Google OAuth URL Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate Google login URL' }, { status: 500 });
  }
}
