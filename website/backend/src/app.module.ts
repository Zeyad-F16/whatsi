import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LicenseModule } from './license/license.module';
import { PaymobModule } from './paymob/paymob.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, LicenseModule, PaymobModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
