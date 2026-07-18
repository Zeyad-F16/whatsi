import { NextResponse } from 'next/server';
import { verifyUserAuth } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: Request) {
  const payload = verifyUserAuth(request);
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes = db.prepare(`
      SELECT 
        id, name, plan_type, activation_code, code_used, machine_id, 
        start_date, expiry_date, is_active 
      FROM clients 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(payload.userId);

    return NextResponse.json({ success: true, codes });
  } catch (error) {
    console.error('Error fetching user codes:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
