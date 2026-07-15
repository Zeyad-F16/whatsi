import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' });
  response.cookies.delete('whatsi_admin_token');
  return response;
}
