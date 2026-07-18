import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { adminLoginSchema } from '@/lib/validations';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables!");
}

export async function POST(request: Request) {
  const body = await request.json();
  const validationResult = adminLoginSchema.safeParse(body);
  
  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: validationResult.error.errors[0].message },
      { status: 400 }
    );
  }
  const { username, password } = validationResult.data;

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown';
  const limitResult = rateLimit(`login_${ip}`, 6, 10 * 60 * 1000);

  if (!limitResult.success) {
    return NextResponse.json(
      { success: false, message: 'محاولات خاطئة كثيرة. الرجاء المحاولة بعد 10 دقائق.' },
      { status: 429 }
    );
  }

  try {
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم وكلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    // Fetch admin from database
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;

    if (!admin) {
      return NextResponse.json({ success: false, message: 'اسم المستخدم غير صحيح' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json({ success: false, message: 'كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
    
    response.cookies.set({
      name: 'whatsi_admin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ داخلي' },
      { status: 500 }
    );
  }
}
