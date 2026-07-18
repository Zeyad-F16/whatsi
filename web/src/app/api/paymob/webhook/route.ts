import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

function calcExpiry(startDate: string, planType: string) {
  const d = new Date(startDate);
  if (planType === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

export async function POST(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const hmac = searchParams.get('hmac');
    
    const body = await request.json();

    // HMAC Verification
    if (hmac) {
      const obj = body.obj;
      // Lexicographical order for HMAC payload
      const hmacString = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order.id,
        obj.owner,
        obj.pending,
        obj.source_data.pan,
        obj.source_data.sub_type,
        obj.source_data.type,
        obj.success
      ].join('');

      const hashed = crypto.createHmac('sha512', process.env.PAYMOB_HMAC_SECRET as string)
                           .update(hmacString)
                           .digest('hex');

      if (hashed !== hmac) {
        console.error("HMAC invalid");
        return NextResponse.json({ message: "Invalid HMAC" }, { status: 401 });
      }
    }

    if (body.type === "TRANSACTION" && body.obj.success === true) {
      const obj = body.obj;
      // We stored the userId in the last_name field of billing_data
      const userId = parseInt(obj.order.billing_data.last_name);
      const amountCents = parseInt(obj.amount_cents);
      const amountPaid = amountCents / 100;
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      
      if (user) {
        // Determine plan by amount (Assuming 99 is monthly, 999 is yearly)
        const plan_type = amountCents >= 99900 ? 'yearly' : 'monthly';
        const start_date = new Date().toISOString().split('T')[0];
        const expiry_date = calcExpiry(start_date, plan_type);
        const activation_code = generateCode();

        const stmt = db.prepare(`
          INSERT INTO clients (user_id, name, plan_type, amount_paid, activation_code, start_date, expiry_date, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
          user.id,
          user.name,
          plan_type,
          amountPaid,
          activation_code,
          start_date,
          expiry_date,
          `Paid via Paymob Order #${obj.order.id}`
        );

        db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (?, ?, ?)`)
          .run(result.lastInsertRowid, 'CLIENT_CREATED', `Self-service via Paymob Webhook`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
