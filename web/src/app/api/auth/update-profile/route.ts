import { NextResponse } from 'next/server';
import { verifyUserAuth } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const payload = verifyUserAuth(request);
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, phone, currentPassword, newPassword } = await request.json();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    let passwordHash = user.password_hash;

    // Handle password update
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, message: 'Current password is required to set a new password' }, { status: 400 });
      }

      // If user has a password (they might not if they signed up with Google)
      if (user.password_hash) {
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
          return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
        }
      }

      // Hash new password
      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    db.prepare('UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?')
      .run(name || user.name, phone || user.phone, passwordHash, payload.userId);

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
