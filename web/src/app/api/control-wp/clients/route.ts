import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate an activation code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Helper to calc expiry
function calcExpiry(startDate: string, planType: string) {
  const d = new Date(startDate);
  if (planType === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

// GET /api/control-wp/clients
export async function GET(request: Request) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const clients = db.prepare(`
      SELECT 
        c.id, c.name, c.phone, c.plan_type, c.amount_paid,
        c.activation_code, c.code_used, c.machine_id,
        c.start_date, c.expiry_date, c.is_active, c.notes, c.created_at,
        u.email as user_email, u.name as user_name,
        CASE WHEN date('now', 'localtime') > c.expiry_date THEN 1 ELSE 0 END AS is_expired,
        CAST((julianday(c.expiry_date) - julianday('now', 'localtime')) AS INTEGER) AS days_remaining
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `).all();

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/control-wp/clients
export async function POST(request: Request) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, phone, plan_type, amount_paid, start_date, notes } = body;

    if (!name || !plan_type || !start_date) {
      return NextResponse.json(
        { success: false, message: 'الاسم ونوع الاشتراك وتاريخ البداية مطلوبة' },
        { status: 400 }
      );
    }
    if (!['monthly', 'yearly'].includes(plan_type)) {
      return NextResponse.json(
        { success: false, message: 'نوع الاشتراك يجب أن يكون monthly أو yearly' },
        { status: 400 }
      );
    }

    const activation_code = generateCode();
    const expiry_date = calcExpiry(start_date, plan_type);

    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, plan_type, amount_paid, activation_code, start_date, expiry_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      phone || null,
      plan_type,
      amount_paid || 0,
      activation_code,
      start_date,
      expiry_date,
      notes || null
    );

    // Log the action
    db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (?, ?, ?)`)
      .run(result.lastInsertRowid, 'CLIENT_CREATED', `Created by Admin`);

    return NextResponse.json({
      success: true,
      message: 'تمت إضافة العميل بنجاح',
      client_id: result.lastInsertRowid,
      activation_code
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء الحفظ' }, { status: 500 });
  }
}
