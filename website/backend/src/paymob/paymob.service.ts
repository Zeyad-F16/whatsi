import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymobService {
  private readonly publicKey = process.env.PAYMOB_PUBILC_KEY || process.env.PAYMOB_PUBLIC_KEY;
  private readonly secretKey = process.env.PAYMOB_SECRET_KEY;
  private readonly integrationId = process.env.PAYMOB_INTEGRATION_ID;
  private readonly hmac = process.env.PAYMOB_HMAC;

  constructor(private readonly prisma: PrismaService) {}

  async createPaymentLink(amount: number, clientData: any, planType: string) {
    if (!this.publicKey || !this.secretKey || !this.integrationId) {
      throw new BadRequestException('Paymob public key, secret key, or integration ID is missing');
    }

    try {
      const amountCents = Math.round(amount * 100);

      const response = await fetch('https://accept.paymob.com/v1/intention/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: 'EGP',
          payment_methods: [parseInt(this.integrationId)],
          items: [],
          billing_data: {
            apartment: 'NA',
            email: clientData.email || 'noemail@example.com',
            floor: 'NA',
            first_name: clientData.firstName || 'Client',
            street: 'NA',
            building: 'NA',
            phone_number: clientData.phone || '+201000000000',
            shipping_method: 'NA',
            postal_code: 'NA',
            city: 'NA',
            country: 'EG',
            last_name: clientData.lastName || 'User',
            state: 'NA',
          },
          customer: {
            first_name: clientData.firstName || 'Client',
            last_name: clientData.lastName || 'User',
            email: clientData.email || 'noemail@example.com',
          }
        }),
      });

      const data = await response.json();
      
      if (!data.client_secret) {
        console.error('Paymob Intention Error:', data);
        throw new Error('No client secret returned');
      }

      return {
        iframeUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.publicKey}&clientSecret=${data.client_secret}`,
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async handleWebhook(payload: any) {
    if (payload.type === 'TRANSACTION' && payload.obj.success) {
      // Payment successful
      const amountPaid = payload.obj.amount_cents / 100;
      // In a real scenario, you'd extract client details from payload.obj.order.shipping_data
      // or custom fields to create the client in DB.
      
      const email = payload.obj.order?.shipping_data?.email;
      const firstName = payload.obj.order?.shipping_data?.first_name || 'Client';
      
      // Generate a unique activation code
      const activationCode = 'WHTSI-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      // Assuming planType is derived from amount or metadata.
      const planType = amountPaid > 500 ? 'yearly' : 'monthly';
      const startDate = new Date().toISOString().split('T')[0];
      
      const expiryDateObj = new Date();
      if (planType === 'yearly') {
        expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
      } else {
        expiryDateObj.setMonth(expiryDateObj.getMonth() + 1);
      }
      const expiryDate = expiryDateObj.toISOString().split('T')[0];

      // Create client
      await this.prisma.client.create({
        data: {
          name: firstName,
          phone: payload.obj.order?.shipping_data?.phone_number || '',
          planType,
          amountPaid,
          activationCode,
          startDate,
          expiryDate,
        },
      });

      // Here we could also send an email with the activation code.
    }
    return { success: true };
  }

  async verifySuccessRedirect(body: { clientData: any; planType: string; amount: number }) {
    const { clientData, planType, amount } = body;
    if (!clientData || !clientData.firstName) {
      throw new BadRequestException('Client data missing');
    }

    const name = `${clientData.firstName} ${clientData.lastName}`.trim();
    const phone = clientData.phone || '';
    const notes = clientData.email || '';

    // Check if client with this name and notes (email) already created
    const existing = await this.prisma.client.findFirst({
      where: {
        name,
        notes: notes ? notes : undefined,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      return { success: true, client: existing };
    }

    const activationCode = 'WHTSI-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const startDate = new Date().toISOString().split('T')[0];
    const expiryDateObj = new Date();
    if (planType === 'yearly') {
      expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
    } else {
      expiryDateObj.setMonth(expiryDateObj.getMonth() + 1);
    }
    const expiryDate = expiryDateObj.toISOString().split('T')[0];

    const newClient = await this.prisma.client.create({
      data: {
        name,
        phone,
        planType: planType || 'monthly',
        amountPaid: amount ? parseFloat(amount.toString()) : 25,
        activationCode,
        startDate,
        expiryDate,
        notes,
      },
    });

    return { success: true, client: newClient };
  }
}
