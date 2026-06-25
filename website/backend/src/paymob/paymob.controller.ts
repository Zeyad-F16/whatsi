import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { PaymobService } from './paymob.service';

@Controller('api/paymob')
export class PaymobController {
  constructor(private readonly paymobService: PaymobService) {}

  @Post('checkout')
  async checkout(@Body() body: { amount: number; planType: string; clientData: any }) {
    const { amount, planType, clientData } = body;
    const result = await this.paymobService.createPaymentLink(amount, clientData, planType);
    return result; // contains iframeUrl
  }

  @Post('webhook')
  async webhook(@Body() payload: any) {
    return this.paymobService.handleWebhook(payload);
  }

  @Post('verify-success')
  async verifySuccess(@Body() body: any) {
    return this.paymobService.verifySuccessRedirect(body);
  }
}
