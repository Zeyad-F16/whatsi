import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const decoded = verifyAuth(request);
  if (!decoded) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { currentPassword, newUsername, newPassword } = body;

    if (!currentPassword || !newUsername) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم وكلمة المرور الحالية مطلوبة' },
        { status: 400 }
      );
    }

    // Fetch the admin
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get((decoded as any).id) as any;

    if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور الحالية غير صحيحة' },
        { status: 401 }
      );
    }

    // Check if new username is taken by another admin
    if (newUsername !== admin.username) {
      const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(newUsername);
      if (existing) {
        return NextResponse.json(
          { success: false, message: 'اسم المستخدم مسجل مسبقاً' },
          { status: 400 }
        );
      }
    }

    // Prepare update
    let newHash = admin.password_hash;
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' },
          { status: 400 }
        );
      }
      newHash = bcrypt.hashSync(newPassword, 10);
    }

    db.prepare('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?')
      .run(newUsername, newHash, admin.id);

    // Log this action
    db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (NULL, ?, ?)`)
      .run('ADMIN_SETTINGS_UPDATED', `Admin settings updated by: ${admin.username}`);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح. يرجى تسجيل الدخول مجدداً.',
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ داخلي أثناء تحديث الإعدادات' },
      { status: 500 }
    );
  }
}
