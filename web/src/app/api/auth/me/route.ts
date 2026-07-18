import { NextResponse } from 'next/server';
import { verifyUserAuth } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: Request) {
  const payload = verifyUserAuth(request);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payload.userId);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user });
}
