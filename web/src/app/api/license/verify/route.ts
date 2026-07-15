import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { machine_id } = body;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!machine_id) {
      return NextResponse.json(
        { success: false, message: 'معرف الجهاز مطلوب' },
        { status: 400 }
      );
    }

    const client = db.prepare('SELECT * FROM clients WHERE machine_id = ?').get(machine_id) as any;

    if (!client) {
      return NextResponse.json(
        { success: false, message: 'هذا الجهاز غير مسجل. يرجى التفعيل أولاً', needs_activation: true },
        { status: 404 }
      );
    }

    if (!client.is_active) {
      return NextResponse.json(
        { success: false, message: 'هذا الحساب معطل. يرجى التواصل مع الدعم' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString().split('T')[0];
    
    if (now > client.expiry_date) {
      db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address) VALUES (?, ?, ?, ?)`)
        .run(client.id, 'VERIFY_EXPIRED', machine_id, ip);
        
      return NextResponse.json(
        {
          success: false,
          expired: true,
          message: 'انتهت صلاحية اشتراكك. يرجى التجديد للاستمرار',
          expiry_date: client.expiry_date,
          client_name: client.name
        },
        { status: 403 }
      );
    }

    // Calculate days remaining
    const expiryMs = new Date(client.expiry_date).getTime();
    const nowMs = new Date(now).getTime();
    const daysRemaining = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

    db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address) VALUES (?, ?, ?, ?)`)
      .run(client.id, 'VERIFY_OK', machine_id, ip);

    return NextResponse.json({
      success: true,
      message: 'الترخيص صالح',
      license: {
        client_name: client.name,
        plan_type: client.plan_type,
        expiry_date: client.expiry_date,
        days_remaining: daysRemaining
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
