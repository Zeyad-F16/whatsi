import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activation_code, machine_id } = body;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!activation_code || !machine_id) {
      return NextResponse.json(
        { success: false, message: 'كود التفعيل ومعرف الجهاز مطلوبان' },
        { status: 400 }
      );
    }

    const client = db.prepare('SELECT * FROM clients WHERE activation_code = ?').get(activation_code) as any;

    if (!client) {
      db.prepare(`INSERT INTO license_logs (action, machine_id, ip_address, details) VALUES (?, ?, ?, ?)`)
        .run('ACTIVATE_FAILED_INVALID_CODE', machine_id, ip, `Code: ${activation_code}`);
      return NextResponse.json(
        { success: false, message: 'كود التفعيل غير صحيح' },
        { status: 404 }
      );
    }

    if (client.code_used) {
      db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address, details) VALUES (?, ?, ?, ?, ?)`)
        .run(client.id, 'ACTIVATE_FAILED_CODE_USED', machine_id, ip, 'Code already used');
      return NextResponse.json(
        { success: false, message: 'كود التفعيل مستخدم مسبقاً' },
        { status: 409 }
      );
    }

    if (!client.is_active) {
      return NextResponse.json(
        { success: false, message: 'هذا الحساب معطل. يرجى التواصل مع الدعم' },
        { status: 403 }
      );
    }

    // Get current date string in YYYY-MM-DD
    const now = new Date().toISOString().split('T')[0];
    
    if (now > client.expiry_date) {
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية هذا الترخيص. يرجى التجديد' },
        { status: 403 }
      );
    }

    // Mark code as used and bind machine_id
    db.prepare('UPDATE clients SET code_used = 1, machine_id = ? WHERE id = ?')
      .run(machine_id, client.id);

    db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address, details) VALUES (?, ?, ?, ?, ?)`)
      .run(client.id, 'ACTIVATED', machine_id, ip, `Client: ${client.name}`);

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل التطبيق بنجاح',
      license: {
        client_name: client.name,
        plan_type: client.plan_type,
        expiry_date: client.expiry_date,
      }
    });

  } catch (error) {
    console.error('Activate error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
