import { Module } from '@nestjs/common';
import { PaymobService } from './paymob.service';
import { PaymobController } from './paymob.controller';

@Module({
  providers: [PaymobService],
  controllers: [PaymobController]
})
export class PaymobModule {}
