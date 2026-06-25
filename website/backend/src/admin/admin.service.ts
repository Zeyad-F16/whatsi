import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async login(password: string) {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('كلمة المرور غير صحيحة');
    }
    // In a real app, generate JWT. For now, returning a simple token.
    const tokenHash = 'admin-token-' + Date.now();
    await this.prisma.adminSession.create({
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    return { success: true, token: tokenHash };
  }

  async getStats() {
    const totalClients = await this.prisma.client.count();
    const activeClients = await this.prisma.client.count({ where: { isActive: true } });
    
    // Total Revenue
    const revenueAgg = await this.prisma.client.aggregate({
      _sum: { amountPaid: true },
    });
    
    return {
      success: true,
      stats: {
        totalClients,
        activeClients,
        totalRevenue: revenueAgg._sum.amountPaid || 0,
      },
    };
  }

  async getClients() {
    const clients = await this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, clients };
  }

  async createClient(data: any) {
    const activationCode = 'WHTSI-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const client = await this.prisma.client.create({
      data: {
        ...data,
        activationCode,
        amountPaid: parseFloat(data.amountPaid || 0),
      },
    });
    return { success: true, client };
  }

  async updateClient(id: number, data: any) {
    const client = await this.prisma.client.update({
      where: { id },
      data,
    });
    return { success: true, client };
  }

  async deleteClient(id: number) {
    await this.prisma.licenseLog.deleteMany({ where: { clientId: id } });
    await this.prisma.client.delete({ where: { id } });
    return { success: true, message: 'Client deleted' };
  }

  async resetClientMachine(id: number) {
    await this.prisma.client.update({
      where: { id },
      data: {
        machineId: null,
        codeUsed: false,
      },
    });
    return { success: true, message: 'تم إعادة تعيين جهاز العميل' };
  }

  async getClientLogs(id: number) {
    const logs = await this.prisma.licenseLog.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, logs };
  }
}
