import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DepositService } from './deposit.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('wallet/deposit')
@UseGuards(JwtAuthGuard)
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post('request')
  async createRequest(
    @Request() req: any,
    @Body('amount') amount: number,
    @Body('paymentMethod') paymentMethod?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = req.user?.id || bodyUserId || '00000000-0000-0000-0000-000000000000';
    return this.depositService.createDepositRequest(userId, amount, paymentMethod);
  }

  @Post('proof/:depositId')
  async submitProof(
    @Request() req: any,
    @Param('depositId') depositId: string,
    @Body('utrNumber') utrNumber: string,
    @Body('proofUrl') proofUrl?: string,
    @Body('userRemarks') userRemarks?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const userId = req.user?.id || bodyUserId || '00000000-0000-0000-0000-000000000000';
    return this.depositService.submitPaymentProof(depositId, userId, utrNumber, proofUrl, userRemarks);
  }
}
