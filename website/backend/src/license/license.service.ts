import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  async activate(activationCode: string, machineId: string, ipAddress: string) {
    if (!activationCode || !machineId) {
      throw new BadRequestException('كود التفعيل ومعرف الجهاز مطلوبان');
    }

    const client = await this.prisma.client.findUnique({
      where: { activationCode },
    });

    if (!client) {
      await this.logAction(null, 'ACTIVATE_FAILED_INVALID_CODE', machineId, ipAddress, `Code: ${activationCode}`);
      throw new NotFoundException('كود التفعيل غير صحيح');
    }

    if (client.codeUsed) {
      await this.logAction(client.id, 'ACTIVATE_FAILED_CODE_USED', machineId, ipAddress, 'Code already used');
      throw new ConflictException('كود التفعيل مستخدم مسبقاً');
    }

    if (!client.isActive) {
      throw new ForbiddenException('هذا الحساب معطل. يرجى التواصل مع الدعم');
    }

    const now = new Date().toISOString().split('T')[0];
    if (now > client.expiryDate) {
      throw new ForbiddenException('انتهت صلاحية هذا الترخيص. يرجى التجديد');
    }

    // Mark as used
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        codeUsed: true,
        machineId,
      },
    });

    await this.logAction(client.id, 'ACTIVATED', machineId, ipAddress, `Client: ${client.name}`);

    return {
      success: true,
      message: 'تم تفعيل التطبيق بنجاح',
      license: {
        client_name: client.name,
        plan_type: client.planType,
        expiry_date: client.expiryDate,
      },
    };
  }

  async verify(machineId: string, ipAddress: string) {
    if (!machineId) {
      throw new BadRequestException('معرف الجهاز مطلوب');
    }

    const client = await this.prisma.client.findFirst({
      where: { machineId },
    });

    if (!client) {
      throw new NotFoundException('هذا الجهاز غير مسجل. يرجى التفعيل أولاً');
    }

    if (!client.isActive) {
      throw new ForbiddenException('هذا الحساب معطل. يرجى التواصل مع الدعم');
    }

    const now = new Date().toISOString().split('T')[0];
    if (now > client.expiryDate) {
      await this.logAction(client.id, 'VERIFY_EXPIRED', machineId, ipAddress);
      return {
        success: false,
        expired: true,
        message: 'انتهت صلاحية اشتراكك. يرجى التجديد للاستمرار',
        expiry_date: client.expiryDate,
        client_name: client.name,
      };
    }

    // Calculate days remaining
    const expiryMs = new Date(client.expiryDate).getTime();
    const nowMs = new Date(now).getTime();
    const daysRemaining = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

    await this.logAction(client.id, 'VERIFY_OK', machineId, ipAddress);

    return {
      success: true,
      message: 'الترخيص صالح',
      license: {
        client_name: client.name,
        plan_type: client.planType,
        expiry_date: client.expiryDate,
        days_remaining: daysRemaining,
      },
    };
  }

  private async logAction(clientId: number | null, action: string, machineId: string, ipAddress: string, details?: string) {
    await this.prisma.licenseLog.create({
      data: {
        clientId,
        action,
        machineId,
        ipAddress,
        details,
      },
    });
  }
}
