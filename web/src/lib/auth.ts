import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables!");
}

export function verifyAuth(request?: Request) {
  let token;
  
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/whatsi_admin_token=([^;]+)/);
        if (match) token = match[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: 'غير مصرح أو الجلسة منتهية' },
    { status: 401 }
  );
}

export function verifyUserAuth(request: Request) {
  let token;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/whatsi_user_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { userId: number, email: string };
  } catch (err) {
    return null;
  }
}

export function generateUserToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}
