import { NextResponse } from 'next/server';
import { verifyUserAuth, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  const user = verifyUserAuth(request);
  if (!user) return unauthorizedResponse();

  try {
    const { plan_type } = await request.json(); // 'monthly' | 'yearly'

    if (!['monthly', 'yearly'].includes(plan_type)) {
      return NextResponse.json({ success: false, message: 'Invalid plan type' }, { status: 400 });
    }

    const amount = plan_type === 'yearly' ? 999 : 99; // Adjust prices as needed
    const amount_cents = amount * 100;

    // 1. Authenticate with Paymob
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });
    const authData = await authRes.json();
    const token = authData.token;

    // 2. Register Order
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: amount_cents.toString(),
        currency: "EGP",
        items: [{
          name: `WhatsiPro ${plan_type} subscription`,
          amount_cents: amount_cents.toString(),
          description: "Activation code subscription",
          quantity: "1"
        }]
      })
    });
    const orderData = await orderRes.json();
    const order_id = orderData.id;

    // 3. Request Payment Key
    const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amount_cents.toString(),
        expiration: 3600,
        order_id: order_id,
        billing_data: {
          apartment: "NA", 
          email: user.email, 
          floor: "NA", 
          first_name: "Customer", 
          street: "NA", 
          building: "NA", 
          phone_number: "+201000000000", 
          shipping_method: "PKG", 
          postal_code: "NA", 
          city: "NA", 
          country: "EG", 
          last_name: user.userId.toString(), 
          state: "NA"
        },
        currency: "EGP",
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
        lock_order_when_paid: "false"
      })
    });
    const paymentKeyData = await paymentKeyRes.json();
    const payment_token = paymentKeyData.token;

    // 4. Generate Iframe URL
    const iframeURL = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${payment_token}`;

    return NextResponse.json({ success: true, url: iframeURL });
  } catch (error) {
    console.error("Paymob checkout error:", error);
    return NextResponse.json({ success: false, message: 'حدث خطأ في تجهيز الدفع' }, { status: 500 });
  }
}
