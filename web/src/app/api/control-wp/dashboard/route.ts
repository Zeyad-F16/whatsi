import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: Request) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(id) as total_clients,
        SUM(CASE WHEN is_active = 1 AND date('now', 'localtime') <= expiry_date THEN 1 ELSE 0 END) as active_clients,
        SUM(CASE WHEN date('now', 'localtime') > expiry_date THEN 1 ELSE 0 END) as expired_clients,
        SUM(CASE WHEN date('now', 'localtime') <= expiry_date AND julianday(expiry_date) - julianday('now', 'localtime') <= 7 THEN 1 ELSE 0 END) as expiring_soon,
        SUM(amount_paid) as total_revenue
      FROM clients
    `).get();

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
