import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { registerSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"WhatsiPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your WhatsiPro account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fcf9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fcf9; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; max-width: 600px; margin: 0 auto;">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; background-color: #000000; text-align: center; line-height: 48px; font-weight: 900; font-size: 24px; color: #00cc50; margin-bottom: 16px;">W</div>
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">Whatsi<span style="color: #00cc50;">Pro</span></h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 40px 30px 40px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">Verify your email address</h2>
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #4b5563;">
                      Thanks for starting the new WhatsiPro account creation process. We want to make sure it's really you. Please enter the following verification code when prompted.
                    </p>
                    <div style="background-color: #f0fdf4; border: 2px dashed #00cc50; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
                      <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #00cc50; display: block;">${code}</span>
                    </div>
                    <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                      If you didn't attempt to create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f0f0f0;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 18px;">
                      &copy; ${new Date().getFullYear()} WhatsiPro. All rights reserved.<br/>
                      Turn WhatsApp into an Automated Sales Machine.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: Request) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = rateLimit(ip, 10, 15 * 60 * 1000); // 10 requests / 15 mins
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    
    // Zod Validation & Sanitization
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, message: validationResult.error.errors[0].message }, { status: 400 });
    }

    const { name, email, phone, password } = validationResult.data;

    // Check if email exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (existingUser) {
      if (existingUser.is_verified) {
        return NextResponse.json({ success: false, message: 'Email already registered' }, { status: 400 });
      } else {
        // If exists but not verified, resend code and update password
        const otp = generateOTP();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.prepare('UPDATE users SET name = ?, phone = ?, password_hash = ?, verification_code = ? WHERE email = ?')
          .run(name, phone, hashedPassword, otp, email);
          
        try {
          await sendVerificationEmail(email, otp);
          return NextResponse.json({ success: true, message: 'A new verification code has been sent to your email' });
        } catch (mailError) {
          console.error('Email send error on resend:', mailError);
          return NextResponse.json({ success: true, message: 'Account updated, but failed to send verification email.' });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, verification_code, is_verified) 
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(name, email, phone, hashedPassword, otp);

    try {
      await sendVerificationEmail(email, otp);
      return NextResponse.json({ success: true, message: 'Account created. Please verify your email.' });
    } catch (mailError) {
      console.error('Email send error:', mailError);
      return NextResponse.json({ success: true, message: 'Account created, but failed to send verification email. Please contact support.' });
    }

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
