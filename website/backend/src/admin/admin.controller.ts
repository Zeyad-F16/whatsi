import { Controller, Get, Post, Put, Delete, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(@Body() body: { password: string }) {
    return this.adminService.login(body.password);
  }

  // Middleware or Guard should protect these routes, simplified for demonstration
  private checkAuth(req: any) {
    const token = req.headers.authorization;
    if (!token) throw new UnauthorizedException('يجب تسجيل الدخول');
  }

  @Get('stats')
  getStats(@Req() req: any) {
    this.checkAuth(req);
    return this.adminService.getStats();
  }

  @Get('clients')
  getClients(@Req() req: any) {
    this.checkAuth(req);
    return this.adminService.getClients();
  }

  @Post('clients')
  createClient(@Req() req: any, @Body() body: any) {
    this.checkAuth(req);
    return this.adminService.createClient(body);
  }

  @Put('clients/:id')
  updateClient(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.checkAuth(req);
    return this.adminService.updateClient(Number(id), body);
  }

  @Delete('clients/:id')
  deleteClient(@Req() req: any, @Param('id') id: string) {
    this.checkAuth(req);
    return this.adminService.deleteClient(Number(id));
  }

  @Post('clients/:id/reset')
  resetClientMachine(@Req() req: any, @Param('id') id: string) {
    this.checkAuth(req);
    return this.adminService.resetClientMachine(Number(id));
  }

  @Get('clients/:id/logs')
  getClientLogs(@Req() req: any, @Param('id') id: string) {
    this.checkAuth(req);
    return this.adminService.getClientLogs(Number(id));
  }
}
