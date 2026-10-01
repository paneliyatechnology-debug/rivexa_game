import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  async getReferralStats(@Request() req: any) {
    return this.referralService.getReferralStats(req.user.id);
  }
}
