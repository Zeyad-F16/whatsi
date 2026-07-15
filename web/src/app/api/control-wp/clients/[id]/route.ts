import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id);
    if (!client) {
      return NextResponse.json({ success: false, message: 'العميل غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, phone, plan_type, amount_paid, is_active, notes, expiry_date } = body;

    if (!name || !plan_type) {
      return NextResponse.json({ success: false, message: 'الاسم ونوع الاشتراك مطلوبان' }, { status: 400 });
    }

    const stmt = db.prepare(`
      UPDATE clients 
      SET name = ?, phone = ?, plan_type = ?, amount_paid = ?, is_active = ?, notes = ?, expiry_date = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      name,
      phone || null,
      plan_type,
      amount_paid || 0,
      is_active !== undefined ? is_active : 1,
      notes || null,
      expiry_date,
      params.id
    );

    if (result.changes === 0) {
      return NextResponse.json({ success: false, message: 'العميل غير موجود' }, { status: 404 });
    }

    db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (?, ?, ?)`)
      .run(params.id, 'CLIENT_UPDATED', `Updated by Admin`);

    return NextResponse.json({ success: true, message: 'تم التحديث بنجاح' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء التحديث' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const result = db.prepare('DELETE FROM clients WHERE id = ?').run(params.id);

    if (result.changes === 0) {
      return NextResponse.json({ success: false, message: 'العميل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف العميل' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء الحذف' }, { status: 500 });
  }
}
