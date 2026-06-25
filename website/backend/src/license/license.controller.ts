import { Controller, Post, Body, Req, Ip } from '@nestjs/common';
import { LicenseService } from './license.service';
import { Request } from 'express';

@Controller('api/license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post('activate')
  activate(@Body() body: { activation_code: string; machine_id: string }, @Ip() ip: string) {
    return this.licenseService.activate(body.activation_code, body.machine_id, ip);
  }

  @Post('verify')
  verify(@Body() body: { machine_id: string }, @Ip() ip: string) {
    return this.licenseService.verify(body.machine_id, ip);
  }
}
