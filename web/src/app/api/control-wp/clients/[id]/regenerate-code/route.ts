import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import db from '@/lib/db';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id);
    if (!client) {
      return NextResponse.json({ success: false, message: 'العميل غير موجود' }, { status: 404 });
    }

    const newCode = generateCode();
    
    db.prepare('UPDATE clients SET activation_code = ?, code_used = 0, machine_id = NULL WHERE id = ?')
      .run(newCode, params.id);

    db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (?, ?, ?)`)
      .run(params.id, 'CODE_REGENERATED', `New code: ${newCode}`);

    return NextResponse.json({ 
      success: true, 
      message: 'تم إنشاء كود جديد بنجاح', 
      new_code: newCode 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
